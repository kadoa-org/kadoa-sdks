"""Notification channels service for managing notification channels"""

from __future__ import annotations

import asyncio
import re
from typing import TYPE_CHECKING, Any, Optional

if TYPE_CHECKING:  # pragma: no cover
    pass

from openapi_client.models.v5_notifications_channels_get200_response import (
    V5NotificationsChannelsGet200Response,
)
from openapi_client.models.v5_notifications_channels_get200_response_data_channels_inner_config import (  # noqa: E501
    V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig,
)

from ..core.exceptions import KadoaErrorCode, KadoaHttpError, KadoaSdkError
from ..user import UserService
from .notifications_acl import (
    CreateChannelRequest,
    EmailChannelConfig,
    ListChannelsRequest,
    NotificationChannel,
    NotificationChannelConfig,
    NotificationChannelType,
    NotificationsApi,
    SlackChannelConfig,
    V5NotificationsChannelsPostRequest,
    WebhookChannelConfig,
    WebsocketChannelConfig,
)


class NotificationChannelsService:
    """Service for managing notification channels"""

    DEFAULT_CHANNEL_NAME = "default"
    CONFIG_WRAPPER = V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig

    def __init__(
        self,
        notifications_api: NotificationsApi,
        user_service: UserService,
    ) -> None:
        self._api = notifications_api
        self._user_service = user_service

    def list_channels(
        self, filters: Optional[ListChannelsRequest] = None
    ) -> list[NotificationChannel]:
        """List notification channels

        Args:
            filters: Optional filters for listing channels

        Returns:
            List of notification channels

        Raises:
            KadoaHttpError: If API request fails
        """
        request_params = {}
        if filters:
            if filters.workflow_id:
                request_params["workflow_id"] = filters.workflow_id

        try:
            response = self._api.v5_notifications_channels_get(**request_params)
            if not response.data:
                return []

            channels = response.data.channels
            if channels is None:
                return []

            return channels
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to list channels",
            )

    def list_all_channels(self, workflow_id: Optional[str] = None) -> list[NotificationChannel]:
        """List all channels (both workflow-specific and workspace-level)

        This is useful for finding workspace-level channels like WebSocket channels
        that might not be associated with a specific workflow

        Args:
            workflow_id: Optional workflow ID to filter by

        Returns:
            List of all notification channels
        """
        if not workflow_id:
            return self.list_channels(ListChannelsRequest())

        # List both workflow-specific and workspace-level channels
        workflow_channels = self.list_channels(ListChannelsRequest(workflow_id=workflow_id))
        workspace_channels = self.list_channels(ListChannelsRequest())

        # Combine and deduplicate channels
        all_channels = list(workflow_channels)
        existing_ids = {ch.id for ch in all_channels if ch.id}

        for channel in workspace_channels:
            if channel.id and channel.id not in existing_ids:
                all_channels.append(channel)
                existing_ids.add(channel.id)

        return all_channels

    def delete_channel(self, channel_id: str) -> None:
        """Delete a notification channel

        Args:
            channel_id: ID of the channel to delete

        Raises:
            KadoaHttpError: If API request fails
        """
        try:
            self._api.v5_notifications_channels_channel_id_delete(channel_id=channel_id)
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to delete channel",
            )

    def create_channel(
        self,
        channel_type: NotificationChannelType,
        name: Optional[str] = None,
        config: Optional[NotificationChannelConfig] = None,
    ) -> NotificationChannel:
        """Create a notification channel

        Args:
            channel_type: Type of channel to create
            name: Optional channel name (defaults to "default")
            config: Optional channel configuration

        Returns:
            Created notification channel

        Raises:
            KadoaHttpError: If API request fails
            KadoaSdkError: If channel config is invalid
        """
        # Prepare config wrapper for _build_payload
        wrapped_config = self._prepare_config_for_build(config)

        # Build payload with validated config
        payload = self._build_payload(
            CreateChannelRequest(
                name=name or self.DEFAULT_CHANNEL_NAME,
                channel_type=channel_type,
                config=wrapped_config,
            )
        )

        # Extract and prepare config instance for API request
        config_instance = self._prepare_config_instance(payload)

        # Create API request with properly serialized config
        request = self._create_api_request(payload, config_instance)

        try:
            response = self._api.v5_notifications_channels_post(
                v5_notifications_channels_post_request=request
            )

            if not response.data or not response.data.channel:
                raise KadoaHttpError.wrap(
                    Exception("No channel in response"),
                    message="Failed to create channel",
                )

            return NotificationChannel(**response.data.channel)
        except Exception as error:
            if isinstance(error, KadoaHttpError):
                raise
            raise KadoaHttpError.wrap(
                error,
                message="Failed to create channel",
            )

    def _prepare_config_for_build(
        self, config: Optional[NotificationChannelConfig]
    ) -> V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig:
        """Prepare config for _build_payload by wrapping it if needed.

        Args:
            config: Config dict, model object, or None

        Returns:
            Wrapped config that _build_payload can process
        """
        if config is None:
            return self.CONFIG_WRAPPER(actual_instance={})
        elif isinstance(config, dict):
            return self.CONFIG_WRAPPER(actual_instance=config)
        else:
            return config

    def _extract_config_from_payload(
        self, payload: CreateChannelRequest
    ) -> tuple[str, Any]:
        """Extract channel type and raw config from payload.

        Args:
            payload: Built payload request

        Returns:
            Tuple of (channel_type, raw_config)
        """
        config_obj = payload.config
        if isinstance(config_obj, self.CONFIG_WRAPPER):
            raw_config = config_obj.actual_instance
        else:
            raw_config = config_obj

        payload_dict = payload.model_dump(by_alias=True)
        channel_type = payload_dict["channelType"]

        return channel_type, raw_config

    def _prepare_config_instance(self, payload: CreateChannelRequest) -> Any:
        """Prepare config instance for API request serialization.

        Ensures the config is a model object so its to_dict() method
        will use by_alias=True for proper camelCase conversion.

        Args:
            payload: Built payload request

        Returns:
            Config instance ready for API serialization
        """
        channel_type, raw_config = self._extract_config_from_payload(payload)

        # If raw_config is already a model object, use it directly
        if hasattr(raw_config, "model_dump"):
            return raw_config

        # If it's a dict, convert to appropriate model type
        if isinstance(raw_config, dict):
            return self._dict_to_config_model(channel_type, raw_config)

        # Fallback for other types (e.g., WEBSOCKET uses dict)
        return raw_config

    def _dict_to_config_model(
        self, channel_type: str, config_dict: dict
    ) -> EmailChannelConfig | SlackChannelConfig | WebhookChannelConfig | dict:
        """Convert dict config to appropriate model type.

        Args:
            channel_type: Channel type (EMAIL, SLACK, WEBHOOK, etc.)
            config_dict: Config dictionary

        Returns:
            Model instance or dict for WEBSOCKET
        """
        type_to_model = {
            "EMAIL": EmailChannelConfig,
            "SLACK": SlackChannelConfig,
            "WEBHOOK": WebhookChannelConfig,
        }

        model_class = type_to_model.get(channel_type)
        if model_class:
            return model_class(**config_dict)

        # WEBSOCKET and other types use dict directly
        return config_dict

    def _create_api_request(
        self, payload: CreateChannelRequest, config_instance: Any
    ) -> V5NotificationsChannelsPostRequest:
        """Create API request with properly serialized config.

        Args:
            payload: Built payload request
            config_instance: Prepared config instance

        Returns:
            API request ready to send
        """
        payload_dict = payload.model_dump(by_alias=True)

        return V5NotificationsChannelsPostRequest(
            name=payload_dict["name"],
            channelType=payload_dict["channelType"],
            config=self.CONFIG_WRAPPER(actual_instance=config_instance),
        )

    def _build_payload(self, request: CreateChannelRequest) -> CreateChannelRequest:
        """Build channel payload with validated config.

        Args:
            request: Channel creation request

        Returns:
            Request with validated and wrapped config
        """
        unwrapped_config = self._unwrap_config(request.config)
        built_config = self._build_channel_config(request.channel_type, unwrapped_config)

        return CreateChannelRequest(
            name=request.name or "Default Channel",
            channel_type=request.channel_type,
            config=self.CONFIG_WRAPPER(actual_instance=built_config),
        )

    def _unwrap_config(self, config: Any) -> Any:
        """Extract actual config instance from wrapper.

        Args:
            config: Config wrapper, dict, model, or None

        Returns:
            Unwrapped config instance
        """
        if config is None:
            return None
        elif isinstance(config, self.CONFIG_WRAPPER):
            return config.actual_instance
        else:
            return config

    def _build_channel_config(
        self, channel_type: NotificationChannelType, unwrapped_config: Any
    ) -> Any:
        """Build validated config for the given channel type.

        Args:
            channel_type: Type of channel
            unwrapped_config: Raw config (dict, model, or None)

        Returns:
            Built and validated config instance
        """
        builders = {
            "EMAIL": self._build_email_config,
            "SLACK": self._build_slack_config,
            "WEBHOOK": self._build_webhook_config,
            "WEBSOCKET": self._build_websocket_config,
        }

        builder = builders.get(channel_type)
        if builder:
            return builder(unwrapped_config)

        # Unknown channel type - return empty dict
        return {}

    def _build_email_config(
        self, unwrapped_config: Any
    ) -> EmailChannelConfig:
        """Build email channel config with validation."""
        email_config = None
        if unwrapped_config:
            if isinstance(unwrapped_config, dict):
                email_config = EmailChannelConfig(**unwrapped_config) if unwrapped_config else None
            elif isinstance(unwrapped_config, EmailChannelConfig):
                email_config = unwrapped_config

        return self._build_email_channel_config_sync(email_config)

    def _build_slack_config(self, unwrapped_config: Any) -> SlackChannelConfig:
        """Build Slack channel config."""
        if isinstance(unwrapped_config, dict):
            slack_config = (
                SlackChannelConfig(**unwrapped_config)
                if unwrapped_config
                else SlackChannelConfig(slack_channel_id="", slack_channel_name="")
            )
        elif isinstance(unwrapped_config, SlackChannelConfig):
            slack_config = unwrapped_config
        else:
            slack_config = SlackChannelConfig(slack_channel_id="", slack_channel_name="")

        return self._build_slack_channel_config(slack_config)

    def _build_webhook_config(self, unwrapped_config: Any) -> WebhookChannelConfig:
        """Build webhook channel config."""
        if isinstance(unwrapped_config, dict):
            webhook_config = (
                WebhookChannelConfig(**unwrapped_config)
                if unwrapped_config
                else WebhookChannelConfig(webhook_url="", http_method="POST")
            )
        elif isinstance(unwrapped_config, WebhookChannelConfig):
            webhook_config = unwrapped_config
        else:
            webhook_config = WebhookChannelConfig(webhook_url="", http_method="POST")

        return self._build_webhook_channel_config(webhook_config)

    def _build_websocket_config(self, unwrapped_config: Any) -> dict:
        """Build WebSocket channel config."""
        config_dict = self._build_websocket_channel_config(unwrapped_config or {})

        # Ensure empty dict for WebSocket (no config needed)
        if unwrapped_config is None or (
            isinstance(unwrapped_config, dict) and not unwrapped_config
        ):
            config_dict = {}

        return config_dict

    def _build_email_channel_config_sync(
        self, defaults: EmailChannelConfig | dict | None
    ) -> EmailChannelConfig:
        """Build email channel config with validation (sync wrapper)"""
        try:
            # Check if we're in an async context
            loop = asyncio.get_running_loop()
            # We're in an async context, create a new event loop in a thread
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(
                    asyncio.run, self._build_email_channel_config_async(defaults)
                )
                return future.result()
        except RuntimeError:
            # No event loop running, we can use asyncio.run() directly
            return asyncio.run(self._build_email_channel_config_async(defaults))

    async def _build_email_channel_config_async(
        self, defaults: EmailChannelConfig | dict | None
    ) -> EmailChannelConfig:
        """Build email channel config with validation (async implementation)"""
        # Handle case where defaults might be None, dict, or EmailChannelConfig
        if defaults is None or isinstance(defaults, dict):
            recipients = defaults.get("recipients", []) if isinstance(defaults, dict) else []
            from_email = defaults.get("from", None) if isinstance(defaults, dict) else None
        else:
            recipients = defaults.recipients if defaults.recipients else []
            from_email = defaults.var_from

        if not recipients:
            user = await self._user_service.get_current_user()
            recipients = [user.email]

        # Validate email addresses
        email_pattern = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
        validated_recipients = []
        for email in recipients:
            if not email_pattern.match(email):
                raise KadoaSdkError(
                    f"Invalid email address: {email}",
                    code=KadoaErrorCode.VALIDATION_ERROR,
                )
            validated_recipients.append(email)

        # Validate from email if provided
        if from_email and not from_email.endswith("@kadoa.com"):
            raise KadoaSdkError(
                "From email address must end with @kadoa.com",
                code=KadoaErrorCode.VALIDATION_ERROR,
            )

        return EmailChannelConfig(recipients=validated_recipients, var_from=from_email)

    def _build_email_channel_config(
        self, defaults: EmailChannelConfig | dict | None
    ) -> EmailChannelConfig:
        """Build email channel config with validation (deprecated - use _build_email_channel_config_sync)"""
        return self._build_email_channel_config_sync(defaults)

    def _build_slack_channel_config(self, defaults: SlackChannelConfig) -> SlackChannelConfig:
        """Build Slack channel config"""
        return defaults

    def _build_webhook_channel_config(self, defaults: WebhookChannelConfig) -> WebhookChannelConfig:
        """Build webhook channel config"""
        return defaults

    def _build_websocket_channel_config(
        self, defaults: WebsocketChannelConfig
    ) -> WebsocketChannelConfig:
        """Build WebSocket channel config"""
        return defaults
