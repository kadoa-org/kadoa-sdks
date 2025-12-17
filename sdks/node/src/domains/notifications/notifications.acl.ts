/**
 * Notifications domain ACL.
 * Wraps generated NotificationsApi requests/responses and normalizes types.
 * Downstream code must import from this module instead of `generated/**`.
 */

import {
  type EmailChannelConfig,
  NotificationsApi,
  type NotificationsApiInterface,
  type NotificationsApiV5NotificationsChannelsGetRequest,
  type NotificationsApiV5NotificationsSettingsGetRequest,
  type SlackChannelConfig,
  type V5NotificationsChannelsGet200ResponseDataChannelsInner,
  type V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig,
  type V5NotificationsChannelsPostRequest,
  type V5NotificationsChannelsPostRequestChannelTypeEnum,
  type V5NotificationsSettingsGet200ResponseDataSettingsInner,
  V5NotificationsSettingsGetEventTypeEnum,
  type V5NotificationsSettingsPostRequest,
  type V5NotificationsSettingsSettingsIdPutRequest,
  type WebhookChannelConfig,
  type WebhookChannelConfigAuth,
  type WebhookChannelConfigHttpMethodEnum,
} from "../../generated";

// ========================================
// API Client
// ========================================

export { NotificationsApi };
export type { NotificationsApiInterface };

// ========================================
// Enums
// ========================================

/**
 * Notification channel type enum.
 * Re-exported from generated V5NotificationsChannelsPostRequestChannelTypeEnum.
 */
const NotificationChannelType = {
  EMAIL: "EMAIL" as const,
  SLACK: "SLACK" as const,
  WEBHOOK: "WEBHOOK" as const,
  WEBSOCKET: "WEBSOCKET" as const,
} satisfies Record<string, V5NotificationsChannelsPostRequestChannelTypeEnum>;

type NotificationChannelType =
  (typeof NotificationChannelType)[keyof typeof NotificationChannelType];

export { NotificationChannelType };

/**
 * Webhook HTTP method enum.
 * Re-exported from generated WebhookChannelConfigHttpMethodEnum.
 */
export type WebhookHttpMethod = WebhookChannelConfigHttpMethodEnum;

// ========================================
// Request Types
// ========================================

/**
 * Request parameters for listing notification channels.
 */
export class ListChannelsRequest
  implements NotificationsApiV5NotificationsChannelsGetRequest
{
  workflowId?: string;
}

/**
 * Request to create a notification channel with SDK-curated enum types.
 */
export interface CreateChannelRequest
  extends Omit<V5NotificationsChannelsPostRequest, "channelType"> {
  channelType: NotificationChannelType;
}

// ========================================
// Response Types
// ========================================

/**
 * Notification channel response.
 * Note: Response types are simple DTOs without enum fields that need remapping.
 */
export type NotificationChannel =
  V5NotificationsChannelsGet200ResponseDataChannelsInner;

/**
 * Notification channel configuration (union type for all channel configs).
 */
export type NotificationChannelConfig =
  V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig;

// ========================================
// Channel Config Types
// ========================================

/**
 * Email channel configuration.
 */
export type { EmailChannelConfig };

/**
 * Slack channel configuration.
 */
export type { SlackChannelConfig };

/**
 * Webhook channel configuration.
 */
export type { WebhookChannelConfig };

/**
 * Webhook authentication configuration.
 */
export type { WebhookChannelConfigAuth };

/**
 * WebSocket channel configuration (empty object).
 */
export type WebsocketChannelConfig = Record<string, never>;

/**
 * Union of all channel configuration types.
 */
export type ChannelConfig =
  | EmailChannelConfig
  | SlackChannelConfig
  | WebhookChannelConfig
  | WebsocketChannelConfig;

// ========================================
// Notification Settings Types
// ========================================

/**
 * Request parameters for listing notification settings.
 */
export class ListSettingsRequest
  implements NotificationsApiV5NotificationsSettingsGetRequest
{
  workflowId?: string;
  eventType?: NotificationSettingsEventType;
}

/**
 * Request to create notification settings with SDK-curated enum types.
 */
export interface CreateSettingsRequest
  extends Omit<V5NotificationsSettingsPostRequest, "eventType"> {
  eventType: NotificationSettingsEventType;
}

/**
 * Request to update notification settings.
 */
export type UpdateSettingsRequest = V5NotificationsSettingsSettingsIdPutRequest;

/**
 * Notification settings response.
 */
export type NotificationSettings =
  V5NotificationsSettingsGet200ResponseDataSettingsInner;

/**
 * Notification event type enum.
 * Re-exported from generated V5NotificationsSettingsGetEventTypeEnum.
 */
export type NotificationSettingsEventType =
  V5NotificationsSettingsGetEventTypeEnum;
export {
  V5NotificationsSettingsGetEventTypeEnum as NotificationSettingsEventTypeEnum,
};
