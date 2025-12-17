from __future__ import annotations

import json
from typing import Any, Optional

from ..core.core_acl import Configuration, RESTClientObject, create_api_client
from ..core.exceptions import KadoaErrorCode, KadoaHttpError, KadoaSdkError
from ..core.realtime import Realtime, RealtimeConfig
from ..core.settings import get_settings
from ..core.version_check import check_for_updates
from ..extraction import ExtractionModule
from ..extraction.services.extraction_builder_service import (
    ExtractionBuilderService,
    PreparedExtraction,
)
from ..extraction.types import ExtractOptions
from ..schemas import SchemasService
from ..user import UserService
from ..workflows import WorkflowsCoreService
from .models import KadoaClientConfig, KadoaClientStatus, RealtimeOptions
from .wiring import create_notification_domain, create_validation_domain


class KadoaClient:
    """Main client for interacting with the Kadoa API.

    Provides access to extraction, schemas, workflows, notifications, validation,
    and user services. Supports both synchronous and asynchronous operations.

    Args:
        config: Client configuration including API key and timeout

    Example:
        ```python
        from kadoa_sdk import KadoaClient, KadoaClientConfig

        client = KadoaClient(
            KadoaClientConfig(api_key="your-api-key")
        )

        # Connect to realtime (optional)
        realtime = await client.connect_realtime()
        realtime.on_event(lambda event: print(event))

        # Use client services
        result = client.extraction.run(...)
        ```
    """

    def __init__(self, config: KadoaClientConfig) -> None:
        settings = get_settings()

        self._base_url = config.base_url if config.base_url is not None else settings.public_api_uri

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
                    "solution": (
                        "Reinstall certifi by running: pip install --force-reinstall certifi"
                    ),
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
        self._api_client = create_api_client(self._configuration)

        self._realtime: Optional[Realtime] = None

        self.extraction = ExtractionModule(self)
        self.user = UserService(self)
        self.schema = SchemasService(self)
        self.workflow = WorkflowsCoreService(self)
        self._extraction_builder = ExtractionBuilderService(self)

        # domains
        self.notification = create_notification_domain(self)
        self.validation = create_validation_domain(self)

        # Check for updates in the background (non-blocking)
        check_for_updates()

    async def connect_realtime(
        self,
        options: Optional[RealtimeOptions] = None,
    ) -> Realtime:
        """Connect to realtime WebSocket server.

        Establishes a WebSocket connection for real-time event notifications.
        Waits for the connection to be fully established before returning.

        Returns:
            Realtime: The realtime connection instance
        """
        if not self._realtime:
            realtime_config = RealtimeConfig(api_key=self._api_key, **(options or {}))
            self._realtime = Realtime(realtime_config)
            await self._realtime.connect()
        return self._realtime

    def disconnect_realtime(self) -> None:
        """Disconnect from realtime WebSocket server."""
        if self._realtime:
            self._realtime.close()
            self._realtime = None

    def is_realtime_connected(self) -> bool:
        """Check if realtime WebSocket is connected."""
        return self._realtime.is_connected() if self._realtime else False

    @property
    def realtime(self) -> Optional[Realtime]:
        """Get the realtime connection (if enabled)."""
        return self._realtime

    @property
    def configuration(self) -> Configuration:
        """Get the underlying API client configuration."""
        return self._configuration

    @property
    def base_url(self) -> str:
        """Get the base URL for API requests."""
        return self._base_url

    @property
    def timeout(self) -> int:
        """Get the request timeout in seconds."""
        return self._timeout

    @property
    def api_key(self) -> str:
        """Get the API key used for authentication."""
        return self._api_key

    def dispose(self) -> None:
        """Dispose of client resources including realtime connections."""
        if self._realtime:
            self.disconnect_realtime()

    def close(self) -> None:
        """Alias for dispose() for common Python client ergonomics."""
        self.dispose()

    async def status(self) -> KadoaClientStatus:
        """Get the status of the client."""

        return KadoaClientStatus(
            base_url=self._base_url,
            user=await self.user.get_current_user(),
            realtime_connected=self.is_realtime_connected(),
        )

    def extract(self, options: ExtractOptions) -> PreparedExtraction:
        """Create a prepared extraction using the fluent builder API."""
        return self._extraction_builder.extract(options)

    def _build_auth_headers(self) -> dict[str, str]:
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
        """Make a raw HTTP request and return parsed JSON response."""
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


