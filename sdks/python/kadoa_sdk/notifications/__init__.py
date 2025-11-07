"""
Notifications domain exports.
Public boundary for notification functionality.
"""

# Service classes
from .notification_channels_service import NotificationChannelsService
from .notification_settings_service import NotificationSettingsService
from .notification_setup_service import (
    ChannelSetupRequestConfig,
    NotificationOptions,
    NotificationSetupRequestChannels,
    NotificationSetupService,
    SetupWorkflowNotificationSettingsRequest,
    SetupWorkspaceNotificationSettingsRequest,
)

# ACL types and enums (owned by notifications_acl.py)
from .notifications_acl import (
    ChannelConfig,
    CreateChannelRequest,
    CreateSettingsRequest,
    EmailChannelConfig,
    ListChannelsRequest,
    ListSettingsRequest,
    NotificationChannel,
    NotificationChannelConfig,
    NotificationChannelType,
    NotificationSettings,
    NotificationSettingsEventType,
    NotificationSettingsEventTypeEnum,
    SlackChannelConfig,
    WebhookChannelConfig,
    WebhookChannelConfigAuth,
    WebhookHttpMethod,
    WebsocketChannelConfig,
)

__all__ = [
    # Services
    "NotificationChannelsService",
    "NotificationSettingsService",
    "NotificationSetupService",
    # Types
    "ChannelSetupRequestConfig",
    "NotificationOptions",
    "NotificationSetupRequestChannels",
    "SetupWorkflowNotificationSettingsRequest",
    "SetupWorkspaceNotificationSettingsRequest",
    "ChannelConfig",
    "CreateChannelRequest",
    "CreateSettingsRequest",
    "EmailChannelConfig",
    "ListChannelsRequest",
    "ListSettingsRequest",
    "NotificationChannel",
    "NotificationChannelConfig",
    "NotificationChannelType",
    "NotificationSettings",
    "NotificationSettingsEventType",
    "NotificationSettingsEventTypeEnum",
    "SlackChannelConfig",
    "WebhookChannelConfig",
    "WebhookChannelConfigAuth",
    "WebhookHttpMethod",
    "WebsocketChannelConfig",
]
