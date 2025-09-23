import { merge } from "es-toolkit";
import { z } from "zod";
import type {
	EmailChannelConfig,
	NotificationsApiInterface,
	NotificationsApiV5NotificationsChannelsGetRequest,
	SlackChannelConfig,
	V5NotificationsChannelsGet200ResponseDataChannelsInner,
	V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig,
	V5NotificationsChannelsPostRequest,
	WebhookChannelConfig,
} from "../../../generated";
import {
	KadoaErrorCode,
	KadoaHttpException,
	KadoaSdkException,
} from "../../runtime/exceptions";
import type { ApiProvider } from "../../runtime/http/api-provider";
import type { UserService } from "../user/user.service";

export type NotificationChannelConfig =
	V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig;

export type NotificationChannel =
	V5NotificationsChannelsGet200ResponseDataChannelsInner;

export const NotificationChannelType = {
	EMAIL: "EMAIL",
	SLACK: "SLACK",
	WEBHOOK: "WEBHOOK",
	WEBSOCKET: "WEBSOCKET",
} as const satisfies Record<string, string>;
export type NotificationChannelType =
	(typeof NotificationChannelType)[keyof typeof NotificationChannelType];

export type WebsocketChannelConfig = Record<string, never>;

export type ChannelConfig =
	| EmailChannelConfig
	| SlackChannelConfig
	| WebhookChannelConfig
	| WebsocketChannelConfig;

const emailChannelConfigSchema = z.object({
	recipients: z
		.array(z.email())
		.min(1, "Recipients are required for email channel"),
	from: z
		.email()
		.refine(
			(email) => email.endsWith("@kadoa.com"),
			"From email address must end with @kadoa.com",
		)
		.optional(),
});

export class NotificationChannelsService {
	/**
	 * Default channel name
	 *
	 */
	public static readonly DEFAULT_CHANNEL_NAME = "default";

	private readonly api: NotificationsApiInterface;
	private readonly userService: UserService;

	constructor(client: ApiProvider, userService: UserService) {
		this.api = client.notifications;
		this.userService = userService;
	}

	async listChannels(
		filters: NotificationsApiV5NotificationsChannelsGetRequest,
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
		config?: Pick<V5NotificationsChannelsPostRequest, "name" | "config">,
	): Promise<NotificationChannel> {
		const payload = await this.buildPayload(
			merge(config || {}, {
				name: NotificationChannelsService.DEFAULT_CHANNEL_NAME,
				channelType: type,
				config: {},
			}),
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

	private async buildPayload(
		request: V5NotificationsChannelsPostRequest,
	): Promise<V5NotificationsChannelsPostRequest> {
		let config: V5NotificationsChannelsGet200ResponseDataChannelsInnerConfig;

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
		const config = merge(defaults, { recipients });
		const result = emailChannelConfigSchema.safeParse(config);
		if (!result.success) {
			throw new KadoaSdkException(`Invalid email channel config`, {
				code: KadoaErrorCode.VALIDATION_ERROR,
				details: {
					issues: result.error.issues,
				},
			});
		}

		return result.data;
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
