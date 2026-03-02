import type {
  NotificationOptions,
  NotificationSettings,
  NotificationSettingsEventType,
  NotificationSetupService,
  SetupWorkflowNotificationSettingsRequest,
  SetupWorkspaceNotificationSettingsRequest,
} from "../domains/notifications";
import type { NotificationChannelsService } from "../domains/notifications/notification-channels.service";
import type { NotificationSettingsService } from "../domains/notifications/notification-settings.service";
import type { KadoaUser } from "../domains/user/user.service";

export interface TeamInfo {
  id: string;
  name: string;
  role: string;
  memberRole: string;
}

export interface BearerAuthOptions {
  bearerToken: string;
}

export interface KadoaClientStatus {
  baseUrl: string;
  user: KadoaUser;
  realtimeConnected: boolean;
}

export interface KadoaClientConfig {
  /**
   * Team API key (`tk-...`). Required unless `bearerToken` is provided.
   */
  apiKey?: string;
  /**
   * Supabase JWT for Bearer auth. When set, requests send
   * `Authorization: Bearer <token>` instead of `x-api-key`.
   * Use {@link KadoaClient.setBearerToken} to update after refresh.
   */
  bearerToken?: string;
  /**
   * Override the base URL for the public API.
   *
   * Defaults to `process.env.KADOA_PUBLIC_API_URI` or `https://api.kadoa.com`.
   */
  baseUrl?: string;
  timeout?: number;
}

export interface TestNotificationRequest {
  eventType: NotificationSettingsEventType;
  workflowId?: string;
}

export interface TestNotificationResult {
  eventId: string;
  eventType: NotificationSettingsEventType;
  workflowId?: string;
}

export interface NotificationDomain {
  channels: NotificationChannelsService;
  settings: NotificationSettingsService;
  setup: NotificationSetupService;
  configure(options: NotificationOptions): Promise<NotificationSettings[]>;
  setupForWorkflow(
    requestData: SetupWorkflowNotificationSettingsRequest,
  ): Promise<NotificationSettings[]>;
  setupForWorkspace(
    requestData: SetupWorkspaceNotificationSettingsRequest,
  ): Promise<NotificationSettings[]>;
  testNotification(
    request: TestNotificationRequest,
  ): Promise<TestNotificationResult>;
}
