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

export interface KadoaClientStatus {
  baseUrl: string;
  user: KadoaUser;
  realtimeConnected: boolean;
}

export interface KadoaClientConfig {
  apiKey: string;
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
