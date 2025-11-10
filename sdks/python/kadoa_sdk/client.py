from __future__ import annotations

import asyncio
import json
from typing import Any, List, Optional

from pydantic import BaseModel

from .core.core_acl import ApiClient, Configuration, RESTClientObject
from .core.exceptions import KadoaErrorCode, KadoaHttpError, KadoaSdkError
from .core.http import (
    get_notifications_api,
)
from .core.realtime import Realtime, RealtimeConfig
from .core.settings import get_settings
from .extraction import ExtractionModule
from .extraction.services.extraction_builder_service import (
    ExtractionBuilderService,
    PreparedExtraction,
)
from .extraction.types import ExtractOptions
from .notifications import (
    NotificationChannelsService,
    NotificationOptions,
    NotificationSettingsService,
    NotificationSetupService,
    SetupWorkflowNotificationSettingsRequest,
    SetupWorkspaceNotificationSettingsRequest,
)
from .schemas import SchemasService
from .user import UserService
from .validation import ValidationCoreService, ValidationDomain, ValidationRulesService
from .version import SDK_LANGUAGE, SDK_NAME, __version__
from .workflows import WorkflowsCoreService
from .core.version_check import check_for_updates


class KadoaClientConfig(BaseModel):
    api_key: Optional[str] = None
    timeout: Optional[int] = None
    enable_realtime: bool = False
    realtime_config: Optional[RealtimeConfig] = None


class KadoaClientStatus(BaseModel):
    """Status information for the Kadoa client"""

    base_url: str
    user: "KadoaUser"  # Forward reference to avoid circular import
    realtime_connected: bool


class KadoaClient:
    """Main client for interacting with the Kadoa API.

    Provides access to extraction, schemas, workflows, notifications, validation,
    and user services. Supports both synchronous and asynchronous operations.

    Args:
        config: Client configuration including API key, timeout, and realtime settings

    Example:
        ```python
        from kadoa_sdk import KadoaClient, KadoaClientConfig

        client = KadoaClient(
            KadoaClientConfig(
                api_key="your-api-key",
                timeout=30,
                enable_realtime=True
            )
        )

        # Use client services
        result = client.extraction.run(...)
        ```
    """

    def __init__(self, config: KadoaClientConfig) -> None:
        settings = get_settings()

        self._base_url = settings.public_api_uri

        if config.timeout is not None:
            self._timeout = config.timeout
        else:
            self._timeout = settings.get_timeout_seconds()

        self._api_key = config.api_key or settings.api_key or ""

        configuration = Configuration()
        configuration.host = self._base_url
        configuration.api_key = {"ApiKeyAuth": self._api_key}
        # Configure SSL certificate verification using certifi
        # This ensures SSL works on systems where Python doesn't have access to system certificates
        try:
            import certifi

            configuration.ssl_ca_cert = certifi.where()
        except ImportError:
            raise KadoaSdkError(
                "SSL certificate bundle not available. Please install certifi: pip install certifi",
                code=KadoaErrorCode.CONFIG_ERROR,
                details={
                    "issue": "certifi package is required for SSL certificate verification",
                    "solution": "Install certifi by running: pip install certifi",
                },
            )
        except Exception as e:
            raise KadoaSdkError(
                f"Failed to configure SSL certificates: {str(e)}. "
                "Please ensure certifi is properly installed: pip install certifi",
                code=KadoaErrorCode.CONFIG_ERROR,
                details={
                    "issue": "Failed to locate SSL certificate bundle",
                    "solution": "Reinstall certifi by running: pip install --force-reinstall certifi",
                    "error": str(e),
                },
                cause=e,
            )

        if not self._api_key:
            raise ValueError(
                "API key is required. Provide it via config.api_key "
                "or KADOA_API_KEY environment variable"
            )

        self._configuration = configuration
        self._api_client = ApiClient(self._configuration)

        self._api_client.default_headers["User-Agent"] = f"{SDK_NAME}/{__version__}"
        self._api_client.default_headers["X-SDK-Version"] = __version__
        self._api_client.default_headers["X-SDK-Language"] = SDK_LANGUAGE

        self._realtime: Optional[Realtime] = None

        self.extraction = ExtractionModule(self)
        self.user = UserService(self)
        self.schema = SchemasService(self)
        self.workflow = WorkflowsCoreService(self)
        self._extraction_builder = ExtractionBuilderService(self)

        notifications_api = get_notifications_api(self)
        user_service = UserService(self)
        channels_service = NotificationChannelsService(notifications_api, user_service)
        settings_service = NotificationSettingsService(notifications_api)
        setup_service = NotificationSetupService(channels_service, settings_service)

        self.notification = NotificationDomain(
            channels=channels_service,
            settings=settings_service,
            setup=setup_service,
        )

        core_service = ValidationCoreService(self)
        rules_service = ValidationRulesService(self)

        self.validation = ValidationDomain(
            core=core_service,
            rules=rules_service,
        )

        if config.enable_realtime:
            self.connect_realtime()

        # Check for updates in the background (non-blocking)
        check_for_updates()

    def connect_realtime(self) -> Realtime:
        """Connect to realtime WebSocket server.

        Establishes a WebSocket connection for real-time event notifications.
        This is a synchronous wrapper around async WebSocket connection.
        The connection is established in a background task if an event loop is running,
        otherwise it blocks until the connection is established.

        Returns:
            Realtime: The realtime connection instance

        Example:
            ```python
            realtime = client.connect_realtime()
            realtime.on_event(lambda event: print(f"Event: {event}"))
            ```
        """
        if not self._realtime:
            realtime_config = RealtimeConfig(api_key=self._api_key)
            self._realtime = Realtime(realtime_config)

            loop = self._realtime._get_or_create_loop()
            if loop.is_running():
                # If loop is already running, schedule connection as a task
                # This allows the connection to happen asynchronously without blocking
                asyncio.create_task(self._realtime.connect())
            else:
                # If no loop is running, run until complete (blocks until connected)
                # This is acceptable for synchronous SDK usage
                loop.run_until_complete(self._realtime.connect())
        return self._realtime

    def disconnect_realtime(self) -> None:
        """Disconnect from realtime WebSocket server.

        Closes the WebSocket connection and cleans up resources.
        Safe to call even if not connected.
        """
        if self._realtime:
            self._realtime.close()
            self._realtime = None

    def is_realtime_connected(self) -> bool:
        """Check if realtime WebSocket is connected.

        Returns:
            bool: True if connected, False otherwise
        """
        return self._realtime.is_connected() if self._realtime else False

    @property
    def configuration(self) -> Configuration:
        """Get the underlying API client configuration.

        Returns:
            Configuration: The API client configuration object
        """
        return self._configuration

    @property
    def base_url(self) -> str:
        """Get the base URL for API requests.

        Returns:
            str: The base URL (e.g., "https://api.kadoa.com")
        """
        return self._base_url

    @property
    def timeout(self) -> int:
        """Get the request timeout in seconds.

        Returns:
            int: Timeout in seconds
        """
        return self._timeout

    @property
    def api_key(self) -> str:
        """Get the API key used for authentication.

        Returns:
            str: The API key
        """
        return self._api_key

    def dispose(self) -> None:
        """Dispose of client resources including HTTP sessions and realtime connections.

        Cleans up all resources associated with the client. Should be called
        when the client is no longer needed. Safe to call multiple times.
        """
        # Note: urllib3 manages connections automatically, no explicit cleanup needed
        # Disconnect realtime
        if self._realtime:
            self.disconnect_realtime()

    async def status(self) -> KadoaClientStatus:
        """Get the status of the client.

        Retrieves current client status including base URL, user information,
        and realtime connection state.

        Returns:
            KadoaClientStatus: Status information including:
                - base_url: The API base URL
                - user: Current user information
                - realtime_connected: Whether realtime is connected

        Example:
            ```python
            status = await client.status()
            print(f"Connected to {status.base_url}")
            print(f"User: {status.user.email}")
            ```
        """

        return KadoaClientStatus(
            base_url=self._base_url,
            user=await self.user.get_current_user(),
            realtime_connected=self.is_realtime_connected(),
        )

    def extract(self, options: ExtractOptions) -> PreparedExtraction:
        """
        Create a prepared extraction using the fluent builder API

        Args:
            options: Extraction options including URLs and optional extraction builder

        Returns:
            PreparedExtraction that can be configured with notifications, monitoring, etc.

        Example:
            ```python
            extraction = client.extract(
                urls=["https://example.com"],
                name="My Extraction"
            ).create()
            ```
        """
        return self._extraction_builder.extract(options)

    def _build_auth_headers(self) -> dict[str, str]:
        """Build authentication headers from client configuration.
        
        Returns:
            Headers dictionary with x-api-key
            
        Raises:
            KadoaSdkError: If API key is not found
        """
        api_key = None
        if getattr(self._configuration, "api_key", None):
            api_key = self._configuration.api_key.get("ApiKeyAuth")
        if not api_key:
            raise KadoaSdkError(
                KadoaSdkError.ERROR_MESSAGES["NO_API_KEY"],
                code=KadoaErrorCode.AUTH_ERROR,
            )
        return {"x-api-key": api_key}

    def make_raw_request(
        self,
        method: str,
        endpoint: str,
        *,
        body: Optional[dict[str, Any]] = None,
        headers: Optional[dict[str, str]] = None,
        error_message: str = "Request failed",
    ) -> dict[str, Any]:
        """Make a raw HTTP request and return parsed JSON response.
        
        Useful for workarounds or when bypassing the generated OpenAPI client.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint path (e.g., "/v4/schemas")
            body: Optional request body (for POST/PUT)
            headers: Optional additional headers
            error_message: Custom error message for failures
            
        Returns:
            Parsed JSON response as dict
            
        Raises:
            KadoaHttpError: If request fails or returns error status
        """
        url = f"{self._base_url}{endpoint}"
        auth_headers = self._build_auth_headers()
        request_headers = {"Content-Type": "application/json", **auth_headers}
        if headers:
            request_headers.update(headers)

        rest = RESTClientObject(self._configuration)
        try:
            response = rest.request(
                method,
                url,
                headers=request_headers,
                body=body,
            )

            if response.status >= 400:
                response_data = response.read()
                try:
                    error_data = json.loads(response_data) if response_data else {}
                except json.JSONDecodeError:
                    error_data = {}

                raise KadoaHttpError(
                    f"HTTP {response.status}: {error_message}",
                    http_status=response.status,
                    endpoint=url,
                    method=method,
                    response_body=error_data,
                    code=KadoaHttpError.map_status_to_code(response.status),
                )

            response_data = response.read()
            return json.loads(response_data) if response_data else {}
        finally:
            pass  # RESTClientObject doesn't have a close method


class NotificationDomain:
    """Notification domain providing access to channels, settings, and setup services"""

    def __init__(
        self,
        channels: NotificationChannelsService,
        settings: NotificationSettingsService,
        setup: NotificationSetupService,
    ) -> None:
        self.channels = channels
        self.settings = settings
        self.setup = setup

    def configure(self, options: NotificationOptions) -> List["NotificationSettings"]:
        """Configure notifications (convenience method)

        Args:
            options: Notification options

        Returns:
            List of created notification settings
        """
        from .notifications.notifications_acl import NotificationSettings

        return self.setup.setup(options)

    def setup_for_workflow(
        self, request: SetupWorkflowNotificationSettingsRequest
    ) -> List["NotificationSettings"]:
        """Setup notifications for a specific workflow

        Args:
            request: Workflow notification setup request

        Returns:
            List of created notification settings
        """
        from .notifications.notifications_acl import NotificationSettings

        return self.setup.setup_for_workflow(request)

    def setup_for_workspace(
        self, request: SetupWorkspaceNotificationSettingsRequest
    ) -> List["NotificationSettings"]:
        """Setup notifications for the workspace

        Args:
            request: Workspace notification setup request

        Returns:
            List of created notification settings
        """
        from .notifications.notifications_acl import NotificationSettings

        return self.setup.setup_for_workspace(request)
