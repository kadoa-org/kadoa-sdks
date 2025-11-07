"""Notification channels service for managing notification channels"""

from __future__ import annotations

import asyncio
import json
import re
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:  # pragma: no cover
    pass

from openapi_client.models.v5_notifications_channels_get200_response import (
    V5NotificationsChannelsGet200Response,
)
from openapi_client.models.v5_notifications_channels_get200_response_data_channels_inner_config import (  # noqa: E501
    V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig,
)

from ..core.core_acl import RESTClientObject
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
        except ValueError as error:
            # Handle deserialization errors when config objects have ambiguous oneOf schemas
            # This happens when API returns configs with None values for required fields
            if "Multiple matches found when deserializing" in str(error):
                return self._list_channels_with_fallback(request_params)
            raise
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to list channels",
            )

    def _list_channels_with_fallback(self, request_params: dict) -> list[NotificationChannel]:
        """Fallback method to list channels by fetching raw response and normalizing configs"""
        # Build URL
        url = f"{self._api.api_client.configuration.host}/v5/notifications/channels"
        if request_params.get("workflow_id"):
            url += f"?workflowId={request_params['workflow_id']}"

        # Get auth headers
        headers = {}
        config = self._api.api_client.configuration
        api_key = config.api_key.get("ApiKeyAuth") if config.api_key else None
        if api_key:
            headers["x-api-key"] = api_key

        # Fetch raw response
        rest = RESTClientObject(config)
        try:
            response = rest.request("GET", url, headers=headers)
            response_data = response.read()
            data = json.loads(response_data)

            # Normalize config objects based on channelType
            if "data" in data and "channels" in data["data"]:
                channels = data["data"]["channels"]
                for channel in channels:
                    if "config" in channel and channel["config"]:
                        channel_type = channel.get("channelType") or channel.get("channel_type")
                        config_data = channel["config"]

                        # Normalize config based on channel type to avoid oneOf ambiguity
                        # Keep only fields relevant to the channel type
                        if channel_type == "EMAIL":
                            # Email config: only keep recipients and from fields
                            normalized_config = {}
                            if "recipients" in config_data:
                                normalized_config["recipients"] = config_data["recipients"]
                            if "from" in config_data:
                                normalized_config["from"] = config_data["from"]
                            channel["config"] = normalized_config
                        elif channel_type == "SLACK":
                            # Slack config: only keep slack-specific fields
                            normalized_config = {}
                            if (
                                "slackChannelId" in config_data
                                and config_data["slackChannelId"] is not None
                            ):
                                normalized_config["slackChannelId"] = config_data["slackChannelId"]
                            if (
                                "slackChannelName" in config_data
                                and config_data["slackChannelName"] is not None
                            ):
                                normalized_config["slackChannelName"] = config_data[
                                    "slackChannelName"
                                ]
                            channel["config"] = normalized_config
                        elif channel_type == "WEBHOOK":
                            # Webhook config: only keep webhook-specific fields
                            normalized_config = {}
                            if (
                                "webhookUrl" in config_data
                                and config_data["webhookUrl"] is not None
                            ):
                                normalized_config["webhookUrl"] = config_data["webhookUrl"]
                            if (
                                "httpMethod" in config_data
                                and config_data["httpMethod"] is not None
                            ):
                                normalized_config["httpMethod"] = config_data["httpMethod"]
                            channel["config"] = normalized_config
                        elif channel_type == "WEBSOCKET":
                            # WebSocket config: typically empty or minimal
                            if not config_data or all(v is None for v in config_data.values()):
                                channel["config"] = {}
                        else:
                            # Unknown channel type: remove None values
                            channel["config"] = {
                                k: v for k, v in config_data.items() if v is not None
                            }

            # Deserialize normalized response
            response_obj = V5NotificationsChannelsGet200Response.from_dict(data)
            if not response_obj.data:
                return []

            channels = response_obj.data.channels
            if channels is None:
                return []

            return channels
        finally:
            pass  # RESTClientObject doesn't have a close method

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
        # Create a placeholder config if None - will be replaced in _build_payload
        placeholder_config = (
            V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig(actual_instance={})
            if not config
            else config
        )

        payload = self._build_payload(
            CreateChannelRequest(
                name=name or self.DEFAULT_CHANNEL_NAME,
                channel_type=channel_type,
                config=placeholder_config,
            )
        )

        # Get the raw config from payload (before wrapping)
        # We need to extract the actual_instance from the wrapped config
        config_obj = payload.config
        if isinstance(config_obj, V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig):
            # Extract the actual config instance
            raw_config = config_obj.actual_instance
        else:
            raw_config = config_obj

        # Convert payload to dict with proper field names (channelType instead of channel_type)
        payload_dict = payload.model_dump(by_alias=True)

        # Create request with proper field names and raw config
        # V5NotificationsChannelsPostRequest expects the config to be wrapped
        # in V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig
        request = V5NotificationsChannelsPostRequest(
            name=payload_dict["name"],
            channelType=payload_dict["channelType"],
            config=V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig(
                actual_instance=raw_config
            ),
        )

        try:
            response = self._api.v5_notifications_channels_post(
                v5_notifications_channels_post_request=request
            )

            if not response.data or not response.data.channel:
                raise KadoaHttpError.wrap(
                    Exception("No channel in response"),
                    message="Failed to create channel",
                )

            # Convert dict to NotificationChannel
            channel_dict = response.data.channel
            return NotificationChannel(**channel_dict)
        except Exception as error:
            if isinstance(error, KadoaHttpError):
                raise
            raise KadoaHttpError.wrap(
                error,
                message="Failed to create channel",
            )

    def _build_payload(self, request: CreateChannelRequest) -> CreateChannelRequest:
        """Build channel payload with validated config"""
        config_raw: NotificationChannelConfig

        # Check if config is already wrapped or None
        if request.config is None:
            unwrapped_config = None
        elif isinstance(
            request.config, V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig
        ):
            # Config is already wrapped, extract the actual instance
            unwrapped_config = request.config.actual_instance
        else:
            unwrapped_config = request.config

        if request.channel_type == "EMAIL":
            # Convert config to EmailChannelConfig if needed
            email_config = None
            if unwrapped_config:
                if isinstance(unwrapped_config, dict):
                    email_config = (
                        EmailChannelConfig(**unwrapped_config) if unwrapped_config else None
                    )
                elif isinstance(unwrapped_config, EmailChannelConfig):
                    email_config = unwrapped_config
            config_raw = self._build_email_channel_config_sync(email_config)
            # Wrap EmailChannelConfig in V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig
            config = V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig(
                actual_instance=config_raw
            )
        elif request.channel_type == "SLACK":
            slack_config = unwrapped_config
            if isinstance(slack_config, dict):
                slack_config = (
                    SlackChannelConfig(**slack_config)
                    if slack_config
                    else SlackChannelConfig(slack_channel_id="", slack_channel_name="")
                )
            elif not isinstance(slack_config, SlackChannelConfig):
                slack_config = SlackChannelConfig(slack_channel_id="", slack_channel_name="")
            config_raw = self._build_slack_channel_config(slack_config)
            # Wrap SlackChannelConfig in V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig
            config = V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig(
                actual_instance=config_raw
            )
        elif request.channel_type == "WEBHOOK":
            webhook_config = unwrapped_config
            if isinstance(webhook_config, dict):
                webhook_config = (
                    WebhookChannelConfig(**webhook_config)
                    if webhook_config
                    else WebhookChannelConfig(webhook_url="", http_method="POST")
                )
            elif not isinstance(webhook_config, WebhookChannelConfig):
                webhook_config = WebhookChannelConfig(webhook_url="", http_method="POST")
            config_raw = self._build_webhook_channel_config(webhook_config)
            # Wrap WebhookChannelConfig in V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig
            config = V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig(
                actual_instance=config_raw
            )
        elif request.channel_type == "WEBSOCKET":
            config_dict = self._build_websocket_channel_config(unwrapped_config or {})
            # For WEBSOCKET, empty dict should work with "object" schema
            # If unwrapped_config was None/empty, use empty dict
            if unwrapped_config is None or (
                isinstance(unwrapped_config, dict) and not unwrapped_config
            ):
                config_dict = {}
            # Wrap WebSocket dict in V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig
            # Empty dict should match "object" schema in oneOf
            try:
                config = V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig(
                    actual_instance=config_dict
                )
            except Exception:
                # If empty dict doesn't work, try with a minimal object
                config = V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig(
                    actual_instance={"type": "websocket"}
                )
        else:
            config = V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig(
                actual_instance={}
            )

        return CreateChannelRequest(
            name=request.name or "Default Channel",
            channel_type=request.channel_type,
            config=config,
        )

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
