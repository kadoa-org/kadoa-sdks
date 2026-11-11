/**
 * Notifications domain exports.
 * Public boundary for notification functionality.
 */

export type {
  ComparableNotificationChannel,
  NotificationDeliveryConfig,
} from "./channel-identity";
export {
  findReusableNotificationChannel,
  notificationChannelDestination,
} from "./channel-identity";
export type {
  NotificationChannelResolver,
  ResolvedNotificationChannel,
} from "./notification-channels.service";
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
  UpdateSettingsRequest,
  WebhookChannelConfig,
  WebhookChannelConfigAuth,
  WebhookHttpMethod,
  WebsocketChannelConfig,
} from "./notifications.acl";
export {
  NotificationChannelType,
  NotificationSettingsEventTypeEnum,
} from "./notifications.acl";
