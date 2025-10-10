/**
 * Notifications domain exports.
 * Public boundary for notification functionality.
 */

// Service classes
export { NotificationChannelsService } from "./notification-channels.service";
export { NotificationSettingsService } from "./notification-settings.service";
// Notification setup types (owned by notification-setup.service.ts)
export type {
  ChannelSetupRequestConfig,
  NotificationOptions,
  NotificationSetupRequestChannels,
  SetupWorkflowNotificationSettingsRequest,
  SetupWorkspaceNotificationSettingsRequest,
} from "./notification-setup.service";
export { NotificationSetupService } from "./notification-setup.service";
// ACL types and enums (owned by notifications.acl.ts)
export type {
  ChannelConfig,
  CreateChannelRequest,
  CreateSettingsRequest,
  EmailChannelConfig,
  ListChannelsRequest,
  ListSettingsRequest,
  NotificationChannel,
  NotificationChannelConfig,
  NotificationSettings,
  NotificationSettingsEventType,
  SlackChannelConfig,
  WebhookChannelConfig,
  WebhookChannelConfigAuth,
  WebhookHttpMethod,
  WebsocketChannelConfig,
} from "./notifications.acl";
export {
  NotificationChannelType,
  NotificationSettingsEventTypeEnum,
} from "./notifications.acl";
