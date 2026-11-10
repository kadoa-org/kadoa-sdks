import { KadoaErrorCode, KadoaSdkException } from "../../runtime/exceptions";
import {
  type NotificationDeliveryConfig,
  notificationChannelDestination,
} from "./channel-identity";
import type {
  NotificationChannelsService,
  ResolvedNotificationChannel,
} from "./notification-channels.service";
import type { NotificationSettingsService } from "./notification-settings.service";
import type {
  ChannelConfig,
  NotificationChannel,
  NotificationChannelType,
  NotificationSettings,
  NotificationSettingsEventType,
  SlackChannelConfig,
  WebhookChannelConfig,
} from "./notifications.acl";

export type ChannelSetupRequestConfig = ChannelConfig & {
  /**
   * Optional display name; omitted names derive from the destination.
   */
  name?: string;
};

export type NotificationSetupRequestChannels = {
  /**
   * - true: resolve the user's default email destination
   * - { channelId: string }: use existing email channel
   * - EmailChannelConfig: resolve matching destinations or create missing ones
   */
  EMAIL?: true | { channelId: string } | ChannelSetupRequestConfig;
  /**
   * - true: resolve the workspace WebSocket destination
   * - { channelId: string }: use existing websocket channel
   */
  WEBSOCKET?: true | { channelId: string };
  /**
   * - { channelId: string }: use existing slack channel
   * - SlackChannelConfig: create a new slack channel using the provided configuration
   */
  SLACK?:
    | { channelId: string }
    | (SlackChannelConfig & {
        /**
         * Optional display name; omitted names derive from the destination.
         */
        name?: string;
      });
  /**
   * - { channelId: string }: use existing webhook channel
   * - WebhookChannelConfig: create a new webhook channel using the provided configuration
   */
  WEBHOOK?:
    | { channelId: string }
    | (WebhookChannelConfig & {
        /**
         * The name of the webhook channel
         */
        name?: string;
      });
};

export interface NotificationOptions {
  workflowId?: string;
  events?: NotificationSettingsEventType[] | "all";
  channels?: NotificationSetupRequestChannels;
}

export interface SetupWorkspaceNotificationSettingsRequest {
  events: NotificationSettingsEventType[] | "all";
  channels: NotificationSetupRequestChannels;
}

export interface SetupWorkflowNotificationSettingsRequest
  extends SetupWorkspaceNotificationSettingsRequest {
  workflowId: string;
}

export class NotificationSetupService {
  constructor(
    private readonly channelsService: NotificationChannelsService,
    private readonly settingsService: NotificationSettingsService,
  ) {}

  async setupForWorkflow(
    request: SetupWorkflowNotificationSettingsRequest,
  ): Promise<NotificationSettings[]> {
    return this.setup(request);
  }
  async setupForWorkspace(
    request: SetupWorkspaceNotificationSettingsRequest,
  ): Promise<NotificationSettings[]> {
    return this.setup(request);
  }

  /** Add destinations, preserving other bindings and disabled state. Reads verify each saved setting. */
  async setup(request: NotificationOptions): Promise<NotificationSettings[]> {
    const scope = { workflowId: request.workflowId ?? "null" };
    const existing = await this.settingsService.listSettings(scope);
    const events =
      !request.events || request.events === "all"
        ? await this.settingsService.listAllEvents()
        : request.events;
    const results: NotificationSettings[] = [];
    for (const eventType of events) {
      const previous = existing.find((s) => s.eventType === eventType);
      const before = (previous?.channels ?? []).flatMap((c) =>
        c.id ? [c.id] : [],
      );
      const channels = await this.setupChannels({
        channels: request.channels ?? {},
        preferredChannelIds: before,
      });
      const channelIds = [
        ...new Set([
          ...before,
          ...channels.flatMap((c) => (c.id ? [c.id] : [])),
        ]),
      ];
      const same = (a: string[], b: string[]) =>
        a.length === b.length &&
        [...a].sort().every((id, i) => id === [...b].sort()[i]);
      if (previous?.id && same(before, channelIds)) {
        results.push(previous);
        continue;
      }
      const saved = previous?.id
        ? await this.settingsService.updateSettings(previous.id, {
            channelIds,
            expectedChannelIds: before,
          })
        : await this.settingsService.createSettings({
            workflowId: request.workflowId,
            eventType,
            eventConfiguration: {},
            enabled: true,
            channelIds,
          });
      const actual = (await this.settingsService.listSettings(scope)).find(
        (s) => s.id === saved.id,
      );
      if (
        !actual ||
        !same(
          actual.channels?.flatMap((c) => (c.id ? [c.id] : [])) ?? [],
          channelIds,
        ) ||
        actual.enabled !== (previous?.enabled ?? true)
      ) {
        throw new KadoaSdkException(
          "Notification setting was not verified; inspect settings before retrying",
          {
            code: KadoaErrorCode.INTERNAL_ERROR,
            details: { settingId: saved.id, outcome: "applied_unverified" },
          },
        );
      }
      results.push(actual);
    }
    return results;
  }

  /** Resolve destinations without binding them. Existing group coverage is local to preferred bindings. */
  async setupChannels(request: {
    workflowId?: string;
    channels: NotificationSetupRequestChannels;
    preferredChannelIds?: readonly string[];
    onResolved?: (result: ResolvedNotificationChannel) => void;
  }): Promise<NotificationChannel[]> {
    const preferred = request.preferredChannelIds ?? [];
    const results: NotificationChannel[] = [];
    for (const [rawType, value] of Object.entries(request.channels)) {
      if (!value) continue;
      const type = rawType as NotificationChannelType;
      if (typeof value === "object" && "channelId" in value) {
        const channel = (await this.channelsService.listAllChannels()).find(
          (c) => c.id === value.channelId && c.channelType === type,
        );
        if (!channel)
          throw new KadoaSdkException(
            "Notification channel not found for the requested type",
            { code: KadoaErrorCode.NOT_FOUND },
          );
        results.push(channel);
        request.onResolved?.({ channel, reused: true });
        continue;
      }
      const { name, ...config } = (
        value === true ? {} : value
      ) as NotificationDeliveryConfig & { name?: string };
      if (type === "EMAIL" && config.recipients?.length) {
        const available = await this.channelsService.listAllChannels();
        const covering = available.filter(
          (c) => preferred.includes(c.id ?? "") && c.channelType === "EMAIL",
        );
        for (const recipient of [
          ...new Set(config.recipients.map((r) => r.trim().toLowerCase())),
        ]) {
          const covered = covering.find((c) => {
            const existingConfig = c.config as NotificationDeliveryConfig;
            return (
              (existingConfig?.recipients ?? []).some(
                (r) => r.trim().toLowerCase() === recipient,
              ) &&
              notificationChannelDestination("EMAIL", {
                ...existingConfig,
                recipients: [recipient],
              }) ===
                notificationChannelDestination("EMAIL", {
                  ...config,
                  recipients: [recipient],
                })
            );
          });
          const resolved = covered
            ? { channel: covered, reused: true }
            : await this.channelsService.resolveChannel(
                type,
                { name, config: { ...config, recipients: [recipient] } },
                preferred,
              );
          results.push(resolved.channel);
          request.onResolved?.(resolved);
        }
      } else {
        const resolved = await this.channelsService.resolveChannel(
          type,
          { name, config },
          preferred,
        );
        results.push(resolved.channel);
        request.onResolved?.(resolved);
      }
    }
    return [...new Map(results.map((c) => [c.id, c])).values()];
  }
}
