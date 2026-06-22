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
  memberRole: string;
  adminEmail: string | null;
}

/**
 * A Bearer token, or a function that returns one (sync or async).
 * Functions are invoked on each request, letting integrations supply a
 * fresh JWT from a session store without re-constructing the client or
 * calling {@link KadoaClient.setBearerToken} after every refresh.
 */
export type BearerTokenProvider = string | (() => string | Promise<string>);

export interface BearerAuthOptions {
  bearerToken: BearerTokenProvider;
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
   * JWT for Bearer auth, or a function returning one (sync or async).
   * When set, requests send `Authorization: Bearer <token>` instead of
   * `x-api-key`.
   *
   * Passing a function enables lazy resolution: the function is invoked
   * on each request, so frontend integrations can return the current
   * Supabase session token without manually calling
   * {@link KadoaClient.setBearerToken} after every refresh.
   *
   * @example
   * ```ts
   * new KadoaClient({
   *   bearerToken: () =>
   *     supabase.auth.getSession().then((s) => s.data.session?.access_token ?? ""),
   * });
   * ```
   */
  bearerToken?: BearerTokenProvider;
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
