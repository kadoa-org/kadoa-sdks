import { KadoaErrorCode, KadoaSdkException } from "../../runtime/exceptions";
import { logger } from "../../runtime/logger";
import type { SlackChannelConfig } from "../../../generated";
import type { WebhookChannelConfig } from "../../../generated";
import {
	type ChannelConfig,
	type NotificationChannel,
	NotificationChannelsService,
	NotificationChannelType,
} from "./notification-channels.service";
import type {
	NotificationSettings,
	NotificationSettingsEventType,
} from "./notification-settings.service";
import type { NotificationSettingsService } from "./notification-settings.service";

const debug = logger.notifications;

export type ChannelSetupRequestConfig = ChannelConfig & {
	/**
	 * The name of the email channel. "default" if not provided
	 */
	name: string;
};

export type NotificationSetupRequestChannels = {
	/**
	 * - true: create a new email channel using user's default email
	 * - { channelId: string }: use existing email channel
	 * - EmailChannelConfig: create a new email channel using the provided configuration
	 */
	EMAIL?:
		| true
		| { channelId: string }
		| (ChannelSetupRequestConfig & {
				/**
				 * The name of the email channel. "default" if not provided
				 */
				name: string;
		  });
	/**
	 * - true: create a new websocket channel using user's default websocket
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
				 * The name of the slack channel. "default" if not provided
				 */
				name: string;
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
				name: string;
		  });
};

export interface NotificationOptions {
	workflowId?: string;
	events?: NotificationSettingsEventType[] | "all";
	channels?: NotificationSetupRequestChannels;
}

export class NotificationSetupService {
	constructor(
		private readonly channelsService: NotificationChannelsService,
		private readonly settingsService: NotificationSettingsService,
	) {}

	/**
	 * Complete workflow notification setup including channels and settings
	 *
	 * @param requestData Workflow notification setup configuration
	 * @returns Array of created notification settings
	 */
	async setup(
		requestData: NotificationOptions,
	): Promise<NotificationSettings[]> {
		requestData.workflowId
			? debug(
					"Setting up notifications for workflow %s",
					requestData.workflowId,
				)
			: debug("Setting up notifications for workspace");

		const channels = await this.setupChannels({
			workflowId: requestData.workflowId,
			channels: requestData.channels || {},
		});

		const events = requestData.events || "all";
		const eventTypes =
			events === "all" ? await this.settingsService.listAllEvents() : events;

		const channelIds = channels
			.map((channel) => channel.id)
			.filter(Boolean) as string[];

		debug(
			"Creating notification settings for workflow %s: %O",
			requestData.workflowId,
			{
				events: eventTypes,
				channels: channelIds,
			},
		);

		const newSettings: NotificationSettings[] = await Promise.all(
			eventTypes.map(async (eventType) => {
				return await this.settingsService.createSettings({
					workflowId: requestData.workflowId,
					channelIds,
					eventType,
					enabled: true,
					eventConfiguration: {},
				});
			}),
		);

		debug(
			requestData.workflowId
				? "Successfully setup notifications for workflow %s"
				: "Successfully setup notifications for workspace",
			requestData.workflowId,
		);
		return newSettings;
	}

	async setupChannels(requestData: {
		workflowId?: string;
		channels: NotificationSetupRequestChannels;
	}): Promise<NotificationChannel[]> {
		// List all channels (both workflow-specific and workspace-level)
		const existingChannels = await this.channelsService.listAllChannels(
			requestData.workflowId,
		);

		const channelsByName = Object.entries(requestData.channels).filter(
			([, value]) => value === true,
		) as [NotificationChannelType, true][];

		const channelsById = Object.entries(requestData.channels).filter(
			([_, value]) => typeof value === "object" && "channelId" in value,
		) as [NotificationChannelType, { channelId: string }][];

		const channelsByConfig = Object.entries(requestData.channels).filter(
			([, value]) => typeof value === "object" && !("channelId" in value),
		) as [NotificationChannelType, ChannelSetupRequestConfig][];

		const channelsByIdResult = await this.handleChannelsById({
			channelsById,
			existingChannels,
			workflowId: requestData.workflowId,
		});

		const defaultChannelsResult = await this.handleDefaultChannels({
			channelsByName,
			existingChannels,
			workflowId: requestData.workflowId,
		});
		const channelsByConfigResult = await this.handleChannelsByConfig({
			channelsByConfig,
			existingChannels,
			workflowId: requestData.workflowId,
		});

		return [
			...channelsByIdResult,
			...defaultChannelsResult,
			...channelsByConfigResult,
		];
	}

	private async handleChannelsById({
		channelsById,
		existingChannels,
		workflowId,
	}: {
		channelsById: [NotificationChannelType, { channelId: string }][];
		existingChannels: NotificationChannel[];
		workflowId?: string;
	}): Promise<NotificationChannel[]> {
		const requestedChannelIds = channelsById.map(
			([_, value]) => value.channelId,
		);
		const resultChannels = existingChannels.filter(
			(channel) => channel.id && requestedChannelIds.includes(channel.id),
		);

		const foundChannelIds = resultChannels.map((channel) => channel.id);
		const missingChannelIds = requestedChannelIds.filter(
			(id) => !foundChannelIds.includes(id),
		);
		if (missingChannelIds.length > 0) {
			throw new KadoaSdkException(
				`Channels not found: ${missingChannelIds.join(", ")}`,
				{
					code: KadoaErrorCode.NOT_FOUND,
					details: {
						workflowId,
						missingChannelIds,
					},
				},
			);
		}

		return resultChannels;
	}

	private async handleDefaultChannels({
		channelsByName,
		existingChannels,
		workflowId,
	}: {
		channelsByName: [NotificationChannelType, true][];
		existingChannels: NotificationChannel[];
		workflowId?: string;
	}): Promise<NotificationChannel[]> {
		const channels = await Promise.all(
			channelsByName.map(async ([channelType]) => {
				// For WebSocket channels, check if there's already ANY WebSocket channel
				// since the API only allows one WebSocket channel per workspace
				const existingChannel =
					channelType === NotificationChannelType.WEBSOCKET
						? existingChannels.find(
								(channel) => channel.channelType === channelType,
							)
						: existingChannels.find(
								(channel) =>
									channel.channelType === channelType &&
									channel.name ===
										NotificationChannelsService.DEFAULT_CHANNEL_NAME,
							);

				if (existingChannel) {
					debug("Using existing default channel: %O", {
						workflowId,
						channelType,
						channelId: existingChannel.id,
					});
					return existingChannel;
				}

				// Channel doesn't exist, create it
				const channel = await this.channelsService.createChannel(channelType);

				debug("Created default channel %O", {
					workflowId,
					channelType,
					channel,
				});

				return channel;
			}),
		);

		return channels;
	}

	private async handleChannelsByConfig({
		channelsByConfig,
		existingChannels,
		workflowId,
	}: {
		channelsByConfig: [NotificationChannelType, ChannelSetupRequestConfig][];
		existingChannels: NotificationChannel[];
		workflowId?: string;
	}): Promise<NotificationChannel[]> {
		if (channelsByConfig.length === 0) {
			return [];
		}

		const channels = await Promise.all(
			channelsByConfig.map(async ([channelType, config]) => {
				const channelName =
					config.name || NotificationChannelsService.DEFAULT_CHANNEL_NAME;

				const existingChannel = existingChannels.find(
					(channel) =>
						channel.channelType === channelType &&
						(channel.name ||
							NotificationChannelsService.DEFAULT_CHANNEL_NAME) === channelName,
				);

				if (existingChannel) {
					debug("Using existing channel: %O", {
						workflowId,
						channelType,
						channelName,
						channelId: existingChannel.id,
					});
					return existingChannel;
				}

				const channel = await this.channelsService.createChannel(channelType, {
					name: channelName,
					config: config,
				});

				debug("Created channel with custom config %O", {
					workflowId,
					channelType,
					channelName,
					channel,
				});

				return channel;
			}),
		);

		return channels;
	}
}
