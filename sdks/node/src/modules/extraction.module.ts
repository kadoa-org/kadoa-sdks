import {
	DataFetcherService,
	type FetchDataOptions,
	type FetchDataResult,
} from "../internal/domains/extraction/services/data-fetcher.service";
import {
	type ExtractionOptions,
	type ExtractionResult,
	ExtractionService,
	type SubmitExtractionResult,
} from "../internal/domains/extraction/services/extraction.service";
import { NotificationSettingsService } from "../internal/domains/notifications/notification-settings.service";
import { NotificationChannelsService } from "../internal/domains/notifications/notification-channels.service";
import type { KadoaClient } from "../kadoa-client";

/**
 * ExtractionModule provides extraction-related functionality
 */
export class ExtractionModule {
	private readonly extractionService: ExtractionService;
	private readonly dataFetcherService: DataFetcherService;
	private readonly channelsService: NotificationChannelsService;
	private readonly settingsService: NotificationSettingsService;

	constructor(client: KadoaClient) {
		this.extractionService = new ExtractionService(client);
		this.dataFetcherService = new DataFetcherService(client);
		this.channelsService = new NotificationChannelsService(
			client,
			client.user.service,
		);
		this.settingsService = new NotificationSettingsService(client);
	}

	/**
	 * Run extraction workflow using dynamic entity detection
	 *
	 * @param options Extraction configuration options including optional notification settings
	 * @returns ExtractionResult containing workflow ID, workflow details, and first page of extracted data
	 *
	 * @example
	 * ```typescript
	 * const result = await client.extraction.run({
	 *   urls: ['https://example.com'],
	 *   name: 'My Extraction',
	 *   notifications: {
	 *     events: ['workflow_completed', 'workflow_failed'],
	 *     channels: {
	 *       email: true,
	 *       slack: { channelId: 'slack-channel-id' }
	 *     }
	 *   }
	 * });
	 * ```
	 */
	async run(options: ExtractionOptions): Promise<ExtractionResult> {
		return await this.extractionService.executeExtraction({
			...options,
			mode: "run",
		});
	}

	/**
	 * Submit extraction workflow for background processing
	 *
	 * @param options Extraction configuration options including optional notification settings
	 * @returns SubmitExtractionResult containing workflow ID
	 *
	 * @example
	 * ```typescript
	 * const result = await client.extraction.submit({
	 *   urls: ['https://example.com'],
	 *   name: 'My Extraction',
	 *   notifications: {
	 *     events: 'all',
	 *     channels: {
	 *       email: true
	 *     }
	 *   }
	 * });
	 * ```
	 */
	async submit(options: ExtractionOptions): Promise<SubmitExtractionResult> {
		return await this.extractionService.executeExtraction({
			...options,
			mode: "submit",
		});
	}

	/**
	 * Fetch paginated data from a workflow
	 *
	 * @param options Options for fetching data including workflowId and pagination parameters
	 * @returns Paginated workflow data with metadata
	 *
	 * @example
	 * ```typescript
	 * // Fetch first page
	 * const firstPage = await client.extraction.fetchData({
	 *   workflowId: 'workflow-id',
	 *   page: 1,
	 *   limit: 100
	 * });
	 *
	 * // Iterate through all pages
	 * for await (const page of client.extraction.fetchDataPages({ workflowId: 'workflow-id' })) {
	 *   console.log(`Processing ${page.data.length} records`);
	 * }
	 * ```
	 */
	async fetchData(options: FetchDataOptions): Promise<FetchDataResult> {
		return this.dataFetcherService.fetchData(options);
	}

	/**
	 * Fetch all data from a workflow across all pages
	 *
	 * @param options Options for fetching data
	 * @returns All workflow data combined from all pages
	 *
	 * @example
	 * ```typescript
	 * const allData = await client.extraction.fetchAllData({
	 *   workflowId: 'workflow-id'
	 * });
	 * ```
	 */
	async fetchAllData(options: FetchDataOptions): Promise<Array<object>> {
		return this.dataFetcherService.fetchAllData(options);
	}

	/**
	 * Create an async iterator for paginated data fetching
	 *
	 * @param options Options for fetching data
	 * @returns Async iterator that yields pages of data
	 *
	 * @example
	 * ```typescript
	 * for await (const page of client.extraction.fetchDataPages({ workflowId: 'workflow-id' })) {
	 *   console.log(`Page ${page.pagination.page}: ${page.data.length} records`);
	 * }
	 * ```
	 */
	fetchDataPages(
		options: FetchDataOptions,
	): AsyncGenerator<FetchDataResult, void, unknown> {
		return this.dataFetcherService.fetchDataPages(options);
	}

	/**
	 * Get notification channels for a workflow
	 *
	 * @param workflowId The workflow ID
	 * @returns Array of notification channels
	 *
	 * @example
	 * ```typescript
	 * const channels = await client.extraction.getNotificationChannels('workflow-id');
	 * ```
	 */
	async getNotificationChannels(workflowId: string) {
		return this.channelsService.listChannels({ workflowId });
	}

	/**
	 * Get notification settings for a workflow
	 *
	 * @param workflowId The workflow ID
	 * @returns Array of notification settings
	 *
	 * @example
	 * ```typescript
	 * const settings = await client.extraction.getNotificationSettings('workflow-id');
	 * ```
	 */
	async getNotificationSettings(workflowId: string) {
		return this.settingsService.listSettings({ workflowId });
	}
}
