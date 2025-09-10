import type { KadoaClient } from "../../kadoa-client";
import { RunExtractionCommand } from "./commands/run-extraction.command";
import type {
	ExtractionOptions,
	ExtractionResult,
	SubmitExtractionResult,
} from "./extraction.types";
import {
	type FetchDataOptions,
	FetchDataQuery,
	type FetchDataResult,
} from "./queries";

/**
 * ExtractionModule provides extraction-related functionality
 */
export class ExtractionModule {
	private readonly runExtractionCommand: RunExtractionCommand;
	private readonly fetchDataQuery: FetchDataQuery;

	constructor(client: KadoaClient) {
		this.runExtractionCommand = new RunExtractionCommand(client);
		this.fetchDataQuery = new FetchDataQuery(client);
	}

	/**
	 * Run extraction workflow using dynamic entity detection
	 *
	 * @param options Extraction configuration options
	 * @returns ExtractionResult containing workflow ID, workflow details, and first page of extracted data
	 *
	 * @example
	 * ```typescript
	 * const result = await client.extraction.run({
	 *   urls: ['https://example.com'],
	 *   name: 'My Extraction'
	 * });
	 * ```
	 */
	async run(options: ExtractionOptions): Promise<ExtractionResult> {
		return this.runExtractionCommand.execute({ ...options, mode: "run" });
	}

	async submit(options: ExtractionOptions): Promise<SubmitExtractionResult> {
		return this.runExtractionCommand.execute({ ...options, mode: "submit" });
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
		return this.fetchDataQuery.execute(options);
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
		return this.fetchDataQuery.fetchAll(options);
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
		return this.fetchDataQuery.pages(options);
	}
}
