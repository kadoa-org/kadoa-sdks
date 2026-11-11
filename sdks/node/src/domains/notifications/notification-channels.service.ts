import { merge } from "es-toolkit";
import {
  KadoaErrorCode,
  KadoaHttpException,
  KadoaSdkException,
} from "../../runtime/exceptions";
import type { UserService } from "../user/user.service";
import {
  findReusableNotificationChannel,
  type NotificationDeliveryConfig,
  notificationChannelDestination,
} from "./channel-identity";
import {
  type CreateChannelRequest,
  type EmailChannelConfig,
  type ListChannelsRequest,
  type NotificationChannel,
  type NotificationChannelConfig,
  NotificationChannelType,
  type NotificationsApiInterface,
  type SlackChannelConfig,
  type WebhookChannelConfig,
  type WebsocketChannelConfig,
} from "./notifications.acl";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ResolvedNotificationChannel {
  channel: NotificationChannel;
  reused: boolean;
}

export interface NotificationChannelResolver {
  readonly channels: readonly NotificationChannel[];
  normalizeConfig(
    type: NotificationChannelType,
    config?: NotificationDeliveryConfig,
  ): Promise<NotificationDeliveryConfig>;
  resolveChannel(
    type: NotificationChannelType,
    request?: { name?: string; config?: NotificationDeliveryConfig },
    preferredChannelIds?: readonly string[],
  ): Promise<ResolvedNotificationChannel>;
}

function validateEmailChannelConfig(
  config: EmailChannelConfig,
): EmailChannelConfig {
  const issues: Array<{ message: string }> = [];

  if (!config.recipients?.length) {
    issues.push({ message: "Recipients are required for email channel" });
  } else {
    for (const email of config.recipients) {
      if (!EMAIL_REGEX.test(email)) {
        issues.push({ message: `Invalid email address: ${email}` });
      }
    }
  }

  if (config.from !== undefined) {
    if (!EMAIL_REGEX.test(config.from)) {
      issues.push({ message: `Invalid from email address: ${config.from}` });
    } else if (!config.from.endsWith("@kadoa.com")) {
      issues.push({ message: "From email address must end with @kadoa.com" });
    }
  }

  if (issues.length > 0) {
    throw new KadoaSdkException("Invalid email channel config", {
      code: KadoaErrorCode.VALIDATION_ERROR,
      details: { issues },
    });
  }

  return config;
}

export class NotificationChannelsService {
  /**
   * Default channel name
   *
   */
  public static readonly DEFAULT_CHANNEL_NAME = "default";

  private readonly api: NotificationsApiInterface;
  private readonly userService: UserService;

  constructor(
    notificationsApi: NotificationsApiInterface,
    userService: UserService,
  ) {
    this.api = notificationsApi;
    this.userService = userService;
  }

  async listChannels(
    filters: ListChannelsRequest,
  ): Promise<NotificationChannel[]> {
    const response = await this.api.v5NotificationsChannelsGet(filters);
    const data = response.data.data?.channels;
    if (!data) {
      throw KadoaHttpException.wrap(response, {
        message: "Failed to list channels",
      });
    }
    return data as NotificationChannel[];
  }

  /**
   * List all channels (both workflow-specific and workspace-level)
   * This is useful for finding workspace-level channels like WebSocket channels
   * that might not be associated with a specific workflow
   */
  async listAllChannels(workflowId?: string): Promise<NotificationChannel[]> {
    if (!workflowId) {
      // If no workflowId, just list workspace-level channels
      return this.listChannels({});
    }

    // List both workflow-specific and workspace-level channels
    const [workflowChannels, workspaceChannels] = await Promise.all([
      this.listChannels({ workflowId }),
      this.listChannels({}),
    ]);

    // Combine and deduplicate channels
    const allChannels = [...workflowChannels];
    workspaceChannels.forEach((channel) => {
      if (!allChannels.find((c) => c.id === channel.id)) {
        allChannels.push(channel);
      }
    });

    return allChannels;
  }

  async deleteChannel(channelId: string): Promise<void> {
    const response = await this.api.v5NotificationsChannelsChannelIdDelete({
      channelId,
    });

    if (response.status !== 200) {
      throw KadoaHttpException.wrap(response, {
        message: "Failed to delete channel",
      });
    }
  }

  async createChannel(
    type: NotificationChannelType,
    config?: Pick<CreateChannelRequest, "name" | "config">,
  ): Promise<NotificationChannel> {
    const payload = await this.buildPayload(
      merge(
        {
          name: NotificationChannelsService.DEFAULT_CHANNEL_NAME,
          channelType: type,
          config: {},
        },
        config || {},
      ),
    );

    const response = await this.api.v5NotificationsChannelsPost({
      v5NotificationsChannelsPostRequest: payload,
    });

    if (response.status === 201) {
      const data = response.data.data?.channel;
      if (!data) {
        throw KadoaHttpException.wrap(response, {
          message: "Failed to create default channels",
        });
      }
      return data as NotificationChannel;
    }

    throw KadoaHttpException.wrap(response, {
      message: "Failed to create default channels",
    });
  }

  private async normalizeConfig(
    type: NotificationChannelType,
    config: NotificationDeliveryConfig = {},
  ): Promise<NotificationDeliveryConfig> {
    const payload = await this.buildPayload({
      channelType: type,
      name: "default",
      config,
    });
    return payload.config as NotificationDeliveryConfig;
  }

  /** One inventory per setup request. Selection still uses each event’s own preferred bindings. */
  async createResolver(): Promise<NotificationChannelResolver> {
    const channels = await this.listAllChannels();
    const normalizeConfig = this.normalizeConfig.bind(this);
    return {
      channels,
      normalizeConfig,
      resolveChannel: async (type, request = {}, preferredChannelIds = []) => {
        const config = await normalizeConfig(type, request.config);
        const existing = findReusableNotificationChannel(
          channels,
          type,
          config,
          preferredChannelIds,
        );
        if (existing) return { channel: existing, reused: true };
        const destination =
          notificationChannelDestination(type, config) ??
          JSON.stringify(config);
        const bytes = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(destination),
        );
        const suffix = Array.from(new Uint8Array(bytes))
          .slice(0, 4)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const base =
          request.name ?? ["kadoa", type.toLowerCase(), suffix].join("-");
        let name = base;
        for (
          let collision = 0;
          channels.some((c) => c.channelType === type && c.name === name);
          collision++
        ) {
          name = `${base.slice(0, 70)}-${suffix}${collision === 0 ? "" : `-${collision + 1}`}`;
        }
        const channel = await this.createChannel(type, { name, config });
        const index = channels.findIndex((c) => c.id === channel.id);
        if (index >= 0) channels[index] = channel;
        else channels.push(channel);
        return { channel, reused: channel.reused === true };
      },
    };
  }

  /** Resolve by the same complete delivery identity as the backend. */
  async resolveChannel(
    type: NotificationChannelType,
    request: { name?: string; config?: NotificationDeliveryConfig } = {},
    preferredChannelIds: readonly string[] = [],
  ): Promise<ResolvedNotificationChannel> {
    return (await this.createResolver()).resolveChannel(
      type,
      request,
      preferredChannelIds,
    );
  }

  private async buildPayload(
    request: CreateChannelRequest,
  ): Promise<CreateChannelRequest> {
    let config: NotificationChannelConfig;

    switch (request.channelType) {
      case NotificationChannelType.EMAIL:
        config = await this.buildEmailChannelConfig(
          request.config as EmailChannelConfig,
        );
        break;
      case NotificationChannelType.SLACK:
        config = await this.buildSlackChannelConfig(
          request.config as SlackChannelConfig,
        );
        break;
      case NotificationChannelType.WEBHOOK:
        config = await this.buildWebhookChannelConfig(
          request.config as WebhookChannelConfig,
        );
        break;
      case NotificationChannelType.WEBSOCKET:
        config = await this.buildWebsocketChannelConfig(
          request.config as WebsocketChannelConfig,
        );
        break;
      default:
        // todo: maybe throw?
        config = {};
    }
    return {
      name: request.name || "Default Channel",
      channelType: request.channelType,
      config: config,
    };
  }

  private async buildEmailChannelConfig(
    defaults: EmailChannelConfig,
  ): Promise<EmailChannelConfig> {
    let recipients = defaults.recipients;
    if (!defaults.recipients?.length) {
      const user = await this.userService.getCurrentUser();
      recipients = [user.email];
    }
    const config = merge(defaults, {
      recipients: [
        ...new Set(recipients.map((r) => r.trim().toLowerCase())),
      ].sort(),
    });
    return validateEmailChannelConfig(config);
  }

  private async buildSlackChannelConfig(
    defaults: SlackChannelConfig,
  ): Promise<SlackChannelConfig> {
    return defaults;
  }

  private async buildWebhookChannelConfig(
    defaults: WebhookChannelConfig,
  ): Promise<WebhookChannelConfig> {
    return defaults;
  }

  private async buildWebsocketChannelConfig(
    defaults: WebsocketChannelConfig,
  ): Promise<WebsocketChannelConfig> {
    return defaults;
  }
}
