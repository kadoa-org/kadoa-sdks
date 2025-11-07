"""
Notifications domain ACL.
Wraps generated NotificationsApi requests/responses and normalizes types.
Downstream code must import from this module instead of `openapi_client/**`.
"""

from __future__ import annotations

from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field

from openapi_client.api.notifications_api import NotificationsApi
from openapi_client.models.email_channel_config import EmailChannelConfig
from openapi_client.models.slack_channel_config import SlackChannelConfig
from openapi_client.models.v5_notifications_channels_get200_response_data_channels_inner import (
    V5NotificationsChannelsGet200ResponseDataChannelsInner,
)
from openapi_client.models.v5_notifications_channels_get200_response_data_channels_inner_config import (  # noqa: E501
    V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig,
)
from openapi_client.models.v5_notifications_channels_post_request import (
    V5NotificationsChannelsPostRequest,
)
from openapi_client.models.v5_notifications_settings_get200_response_data_settings_inner import (
    V5NotificationsSettingsGet200ResponseDataSettingsInner,
)
from openapi_client.models.v5_notifications_settings_post_request import (
    V5NotificationsSettingsPostRequest,
)
from openapi_client.models.webhook_channel_config import WebhookChannelConfig
from openapi_client.models.webhook_channel_config_auth import WebhookChannelConfigAuth

__all__ = ["NotificationsApi"]

NotificationChannelType = Literal["EMAIL", "SLACK", "WEBHOOK", "WEBSOCKET"]

WebhookHttpMethod = Literal["GET", "POST", "PUT", "PATCH", "DELETE"]

NotificationSettingsEventType = Literal[
    "workflow_started",
    "workflow_finished",
    "workflow_failed",
    "workflow_sample_finished",
    "workflow_data_change",
    "system_maintenance",
    "service_degradation",
    "credits_low",
    "free_trial_ending",
]

NotificationSettingsEventTypeEnum = [
    "workflow_started",
    "workflow_finished",
    "workflow_failed",
    "workflow_sample_finished",
    "workflow_data_change",
    "system_maintenance",
    "service_degradation",
    "credits_low",
    "free_trial_ending",
]


class ListChannelsRequest(BaseModel):
    """Request parameters for listing notification channels."""

    workflow_id: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class CreateChannelRequest(BaseModel):
    """Request to create a notification channel with SDK-curated enum types."""

    name: str
    channel_type: NotificationChannelType = Field(alias="channelType")
    config: V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig

    model_config = ConfigDict(populate_by_name=True)


class ListSettingsRequest(BaseModel):
    """Request parameters for listing notification settings."""

    workflow_id: Optional[str] = None
    event_type: Optional[NotificationSettingsEventType] = None

    model_config = ConfigDict(populate_by_name=True)


class CreateSettingsRequest(BaseModel):
    """Request to create notification settings with SDK-curated enum types."""

    workflow_id: Optional[str] = None
    event_type: NotificationSettingsEventType
    event_configuration: dict[str, Any]
    enabled: Optional[bool] = True
    channel_ids: Optional[list[str]] = None

    model_config = ConfigDict(populate_by_name=True)


NotificationChannel = V5NotificationsChannelsGet200ResponseDataChannelsInner

NotificationChannelConfig = V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig

__all__ = [
    "EmailChannelConfig",
    "SlackChannelConfig",
    "WebhookChannelConfig",
    "WebhookChannelConfigAuth",
]

WebsocketChannelConfig = dict[str, Any]

ChannelConfig = Union[
    EmailChannelConfig,
    SlackChannelConfig,
    WebhookChannelConfig,
    WebsocketChannelConfig,
]

NotificationSettings = V5NotificationsSettingsGet200ResponseDataSettingsInner

V5NotificationsChannelsPostRequest = V5NotificationsChannelsPostRequest

V5NotificationsSettingsPostRequest = V5NotificationsSettingsPostRequest

__all__ = [
    "NotificationsApi",
    "NotificationChannelType",
    "WebhookHttpMethod",
    "NotificationSettingsEventType",
    "NotificationSettingsEventTypeEnum",
    "ListChannelsRequest",
    "CreateChannelRequest",
    "ListSettingsRequest",
    "CreateSettingsRequest",
    "NotificationChannel",
    "NotificationChannelConfig",
    "NotificationSettings",
    "EmailChannelConfig",
    "SlackChannelConfig",
    "WebhookChannelConfig",
    "WebhookChannelConfigAuth",
    "WebsocketChannelConfig",
    "ChannelConfig",
    "V5NotificationsChannelsPostRequest",
    "V5NotificationsSettingsPostRequest",
]
