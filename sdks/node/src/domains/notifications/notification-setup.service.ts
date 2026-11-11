import { KadoaErrorCode, KadoaSdkException } from "../../runtime/exceptions";
import {
  type NotificationDeliveryConfig,
  notificationChannelDestination,
} from "./channel-identity";
import type {
  NotificationChannelResolver,
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

type PreparedChannel =
  | { type: NotificationChannelType; channel: NotificationChannel }
  | {
      type: NotificationChannelType;
      name?: string;
      config: NotificationDeliveryConfig;
    };

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
    const workflowId = request.workflowId?.trim();
    if (request.workflowId !== undefined && !workflowId)
      throw new KadoaSdkException("workflowId must not be blank", {
        code: KadoaErrorCode.VALIDATION_ERROR,
      });
    const scope = { workflowId: workflowId ?? "null" };
    const existing = await this.settingsService.listSettings(scope);
    const events =
      !request.events || request.events === "all"
        ? await this.settingsService.listAllEvents()
        : request.events;
    const resolver = await this.channelsService.createResolver();
    const prepared = await this.prepareChannels(
      request.channels ?? {},
      resolver,
    );
    const results: NotificationSettings[] = [];
    for (const eventType of new Set(events)) {
      const previous = existing.find((s) => s.eventType === eventType);
      const before = (previous?.channels ?? []).flatMap((c) =>
        c.id ? [c.id] : [],
      );
      const channels = await this.resolveChannels(prepared, resolver, before);
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
            workflowId,
            eventType,
            eventConfiguration: {},
            enabled: true,
            channelIds,
          });
      let actual: NotificationSettings | undefined;
      try {
        actual = (await this.settingsService.listSettings(scope)).find(
          (s) => s.id === saved.id,
        );
      } catch (cause) {
        throw new KadoaSdkException(
          "Notification setting was not verified; inspect settings before retrying",
          {
            code: KadoaErrorCode.INTERNAL_ERROR,
            details: { settingId: saved.id, outcome: "applied_unverified" },
            cause,
          },
        );
      }
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

  /** Resolve team destinations without attaching them to a workflow or event. */
  async setupChannels(request: {
    channels: NotificationSetupRequestChannels;
    preferredChannelIds?: readonly string[];
    onResolved?: (result: ResolvedNotificationChannel) => void;
  }): Promise<NotificationChannel[]> {
    const resolver = await this.channelsService.createResolver();
    const prepared = await this.prepareChannels(request.channels, resolver);
    return this.resolveChannels(
      prepared,
      resolver,
      request.preferredChannelIds ?? [],
      request.onResolved,
    );
  }

  private async prepareChannels(
    channels: NotificationSetupRequestChannels,
    resolver: NotificationChannelResolver,
  ): Promise<PreparedChannel[]> {
    const result: PreparedChannel[] = [];
    for (const [rawType, value] of Object.entries(channels)) {
      if (!value) continue;
      const type = rawType as NotificationChannelType;
      if (typeof value === "object" && "channelId" in value) {
        const channel = resolver.channels.find(
          (c) => c.id === value.channelId && c.channelType === type,
        );
        if (!channel) {
          throw new KadoaSdkException(
            "Notification channel not found for the requested type",
            {
              code: KadoaErrorCode.NOT_FOUND,
              details: { channelId: value.channelId, channelType: type },
            },
          );
        }
        result.push({ type, channel });
      } else {
        const { name, ...rawConfig } = (
          value === true ? {} : value
        ) as NotificationDeliveryConfig & { name?: string };
        result.push({
          type,
          name,
          config: await resolver.normalizeConfig(type, rawConfig),
        });
      }
    }
    return result;
  }

  private async resolveChannels(
    prepared: PreparedChannel[],
    resolver: NotificationChannelResolver,
    preferred: readonly string[],
    onResolved?: (result: ResolvedNotificationChannel) => void,
  ): Promise<NotificationChannel[]> {
    const result: NotificationChannel[] = [];
    const resolved = (resolution: ResolvedNotificationChannel) => {
      result.push(resolution.channel);
      onResolved?.(resolution);
    };
    for (const request of prepared) {
      const { type } = request;
      if ("channel" in request) {
        // References were validated during preparation, before any write.
        resolved({
          channel: request.channel,
          reused: true,
        });
        continue;
      }
      const { name, config } = request;
      if (type === "EMAIL" && config.recipients?.length) {
        for (const recipient of [...new Set(config.recipients)]) {
          const single = { ...config, recipients: [recipient] };
          const covered = resolver.channels.find((c) => {
            if (!preferred.includes(c.id ?? "") || c.channelType !== "EMAIL")
              return false;
            const existing = c.config as NotificationDeliveryConfig;
            return (
              (existing?.recipients ?? []).some(
                (r) => r.trim().toLowerCase() === recipient,
              ) &&
              notificationChannelDestination("EMAIL", {
                ...existing,
                recipients: [recipient],
              }) === notificationChannelDestination("EMAIL", single)
            );
          });
          resolved(
            covered
              ? { channel: covered, reused: true }
              : await resolver.resolveChannel(
                  type,
                  { name, config: single },
                  preferred,
                ),
          );
        }
      } else
        resolved(
          await resolver.resolveChannel(type, { name, config }, preferred),
        );
    }
    return [...new Map(result.map((c) => [c.id, c])).values()];
  }
}
