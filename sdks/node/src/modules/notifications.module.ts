import type { NotificationChannelsService } from "../internal/domains/notifications/notification-channels.service";
import type {
	NotificationSetupRequestChannels,
	NotificationSetupService,
} from "../internal/domains/notifications/notification-setup.service";
import type {
	NotificationSettingsEventType,
	NotificationSettingsService,
} from "../internal/domains/notifications/notification-settings.service";
import {
	KadoaErrorCode,
	KadoaSdkException,
} from "../internal/runtime/exceptions";

export interface SetupWorkspaceNotificationSettingsRequest {
	events: NotificationSettingsEventType[] | "all";
	channels: NotificationSetupRequestChannels;
}

export interface SetupWorkflowNotificationSettingsRequest
	extends SetupWorkspaceNotificationSettingsRequest {
	workflowId: string;
}

export class NotificationsModule {
	constructor(
		private readonly channelsService: NotificationChannelsService,
		private readonly settingsService: NotificationSettingsService,
		private readonly channelSetupService: NotificationSetupService,
	) {}

	async setupForWorkflow(
		requestData: SetupWorkflowNotificationSettingsRequest,
	) {
		const existingSettings = await this.settingsService.listSettings({
			workflowId: requestData.workflowId,
		});
		if (existingSettings.length > 0) {
			throw new KadoaSdkException("Settings already exist", {
				code: KadoaErrorCode.BAD_REQUEST,
				details: {
					workflowId: requestData.workflowId,
				},
			});
		}

		return this.channelSetupService.setup({
			workflowId: requestData.workflowId,
			events: requestData.events,
			channels: requestData.channels,
		});
	}

	async setupForWorkspace(
		requestData: SetupWorkspaceNotificationSettingsRequest,
	) {
		const existingSettings = await this.settingsService.listSettings({});
		if (existingSettings.length > 0) {
			throw new KadoaSdkException("Workspace settings already exist", {
				code: KadoaErrorCode.BAD_REQUEST,
			});
		}

		return this.channelSetupService.setup({
			events: requestData.events,
			channels: requestData.channels,
		});
	}

	/**
	 * Get the channels service
	 */
	get channels(): NotificationChannelsService {
		return this.channelsService;
	}

	/**
	 * Get the settings service
	 */
	get settings(): NotificationSettingsService {
		return this.settingsService;
	}
}
