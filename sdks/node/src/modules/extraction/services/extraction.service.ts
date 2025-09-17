import { merge } from "es-toolkit";
import type {
	V4WorkflowsWorkflowIdDataGet200Response,
	V4WorkflowsWorkflowIdDataGet200ResponsePagination,
	V4WorkflowsWorkflowIdDataGetOrderEnum,
	WorkflowsApiV4WorkflowsWorkflowIdDataGetRequest,
} from "../../../generated";
import {
	KadoaHttpException,
	KadoaSdkException,
} from "../../../internal/runtime/exceptions";
import { ERROR_MESSAGES } from "../../../internal/runtime/exceptions/base.exception";
import {
	PagedIterator,
	type PagedResponse,
	type PageInfo,
} from "../../../internal/runtime/pagination";
import type { KadoaClient } from "../../../kadoa-client";
import type {
	ExtractionConfig,
	ExtractionOptions,
	ExtractionResult,
	SubmitExtractionResult,
} from "../extraction.types";
import { EntityDetectorService } from "./entity-detector.service";
import { WorkflowManagerService } from "./workflow-manager.service";

export type DataPagination = V4WorkflowsWorkflowIdDataGet200ResponsePagination;
export type WorkflowDataResponse = V4WorkflowsWorkflowIdDataGet200Response;
export type DataSortOrder = V4WorkflowsWorkflowIdDataGetOrderEnum;

export type FetchDataOptions = Partial<
	Pick<
		WorkflowsApiV4WorkflowsWorkflowIdDataGetRequest,
		| "runId"
		| "sortBy"
		| "order"
		| "filters"
		| "page"
		| "limit"
		| "includeAnomalies"
	>
> & {
	workflowId: string;
};

export interface FetchDataResult extends PagedResponse<object> {
	workflowId: string;
	runId?: string | null;
	executedAt?: string | null;
}

export const SUCCESSFUL_RUN_STATES = new Set(["FINISHED", "SUCCESS"]);

export const DEFAULT_OPTIONS: Omit<ExtractionConfig, "urls"> = {
	pollingInterval: 5000,
	maxWaitTime: 300000,
	navigationMode: "single-page" as const,
	location: { type: "auto" },
	name: "Untitled Workflow",
} as const;

/**
 * Service for managing extraction workflows and data fetching
 */
export class ExtractionService {
	private readonly entityDetector: EntityDetectorService;
	private readonly workflowManager: WorkflowManagerService;
	private readonly defaultLimit = 100;

	constructor(private readonly client: KadoaClient) {
		this.entityDetector = new EntityDetectorService(client);
		this.workflowManager = new WorkflowManagerService(client);
	}

	/**
	 * Run extraction workflow using dynamic entity detection
	 */
	async run(options: ExtractionOptions): Promise<ExtractionResult> {
		return this.executeExtraction({ ...options, mode: "run" });
	}

	/**
	 * Submit extraction workflow for asynchronous processing
	 */
	async submit(options: ExtractionOptions): Promise<SubmitExtractionResult> {
		return this.executeExtraction({ ...options, mode: "submit" });
	}

	/**
	 * Fetch a page of workflow data
	 */
	async fetchData(options: FetchDataOptions): Promise<FetchDataResult> {
		try {
			const response = await this.client.workflows.v4WorkflowsWorkflowIdDataGet(
				{
					...options,
					page: options.page ?? 1,
					limit: options.limit ?? this.defaultLimit,
				},
			);

			const result = response.data;
			return result;
		} catch (error) {
			throw KadoaHttpException.wrap(error, {
				message: ERROR_MESSAGES.DATA_FETCH_FAILED,
				details: { workflowId: options.workflowId, page: options.page },
			});
		}
	}

	/**
	 * Fetch all pages of workflow data
	 */
	async fetchAllData(options: FetchDataOptions): Promise<object[]> {
		const iterator = new PagedIterator((pageOptions) =>
			this.fetchData({ ...options, ...pageOptions }),
		);

		return iterator.fetchAll({ limit: options.limit ?? this.defaultLimit });
	}

	/**
	 * Create an async iterator for paginated data fetching
	 */
	async *fetchDataPages(
		options: FetchDataOptions,
	): AsyncGenerator<FetchDataResult, void, unknown> {
		const iterator = new PagedIterator((pageOptions) =>
			this.fetchData({ ...options, ...pageOptions }),
		);

		for await (const page of iterator.pages({
			limit: options.limit ?? this.defaultLimit,
		})) {
			yield page as FetchDataResult;
		}
	}

	/**
	 * Internal method to execute extraction workflow
	 */
	private async executeExtraction(
		options: ExtractionOptions & { mode: "run" | "submit" },
	): Promise<ExtractionResult | SubmitExtractionResult> {
		this.validateOptions(options);

		const config = merge(DEFAULT_OPTIONS, options);

		try {
			// Step 1: Detect entity fields
			const entityPrediction = await this.entityDetector.fetchEntityFields({
				link: config.urls[0],
				location: config.location,
				navigationMode: config.navigationMode,
			});

			this.client.emit(
				"entity:detected",
				{
					entity: entityPrediction.entity,
					fields: entityPrediction.fields,
					url: config.urls[0],
				},
				"extraction",
				{
					navigationMode: config.navigationMode,
					location: config.location,
				},
			);

			// Step 2: Create workflow
			const workflowId = await this.workflowManager.createWorkflow({
				entity: entityPrediction.entity,
				fields: entityPrediction.fields,
				...config,
			});

			this.client.emit(
				"extraction:started",
				{
					workflowId,
					name: config.name,
					urls: config.urls,
				},
				"extraction",
			);

			if (options.mode === "submit") {
				return {
					workflowId,
				};
			}

			// Step 3: Wait for completion
			const workflow = await this.workflowManager.waitForWorkflowCompletion(
				workflowId,
				config.pollingInterval,
				config.maxWaitTime,
			);

			// Step 4: Fetch first page of data if successful
			let data: Array<object> | undefined;
			let pagination: PageInfo | undefined;
			const isSuccess = this.isExtractionSuccessful(workflow.runState);

			if (isSuccess) {
				const dataPage = await this.fetchData({ workflowId });
				data = dataPage.data;
				pagination = dataPage.pagination;

				if (data) {
					const isPartial =
						pagination?.totalCount && data.length < pagination.totalCount;
					this.client.emit(
						"extraction:data_available",
						{
							workflowId,
							recordCount: data.length,
							isPartial: !!isPartial,
							totalCount: pagination?.totalCount,
						},
						"extraction",
					);
				}

				this.client.emit(
					"extraction:completed",
					{
						workflowId,
						success: true,
						finalRunState: workflow.runState,
						finalState: workflow.state,
						recordCount: data?.length,
					},
					"extraction",
				);
			} else {
				this.client.emit(
					"extraction:completed",
					{
						workflowId,
						success: false,
						finalRunState: workflow.runState,
						finalState: workflow.state,
						error: `Extraction completed with unexpected status: ${workflow.runState}`,
					},
					"extraction",
				);

				throw new KadoaSdkException(
					`${ERROR_MESSAGES.WORKFLOW_UNEXPECTED_STATUS}: ${workflow.runState}`,
					{
						code: "INTERNAL_ERROR",
						details: {
							workflowId,
							runState: workflow.runState,
							state: workflow.state,
						},
					},
				);
			}

			return {
				workflowId,
				workflow,
				data,
				pagination,
			};
		} catch (error) {
			throw KadoaHttpException.wrap(error, {
				message: ERROR_MESSAGES.EXTRACTION_FAILED,
				details: { urls: options.urls },
			});
		}
	}

	/**
	 * Validates extraction options
	 */
	private validateOptions(options: ExtractionOptions): void {
		if (!options.urls || options.urls.length === 0) {
			throw new KadoaSdkException(ERROR_MESSAGES.NO_URLS, {
				code: "VALIDATION_ERROR",
			});
		}
	}

	/**
	 * Checks if extraction was successful
	 */
	private isExtractionSuccessful(runState: string | undefined): boolean {
		return runState ? SUCCESSFUL_RUN_STATES.has(runState.toUpperCase()) : false;
	}
}
