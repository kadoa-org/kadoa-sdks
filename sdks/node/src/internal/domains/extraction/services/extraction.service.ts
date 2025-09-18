import { merge } from "es-toolkit";
import type {
	V4WorkflowsWorkflowIdGet200Response,
	WorkflowWithCustomSchemaLocationTypeEnum,
} from "../../../../generated";
import { WorkflowsCoreService } from "../../workflows/workflows-core.service";
import {
	KadoaHttpException,
	KadoaSdkException,
} from "../../../runtime/exceptions";
import { ERROR_MESSAGES } from "../../../runtime/exceptions/base.exception";
import type { PageInfo } from "../../../runtime/pagination";
import type { KadoaClient } from "../../../../kadoa-client";
import type {
	EntityFieldDataType,
	NavigationMode,
	WorkflowInterval,
	MonitoringConfig,
} from "../extraction.types";
import { DataFetcherService } from "./data-fetcher.service";
import type { EntityField } from "./entity-detector.service";
import { EntityDetectorService } from "./entity-detector.service";

const TRANSIENT_WORKFLOW_SCHEMA: EntityField[] = [
	{
		name: "url",
		description: "link",
		example: "url",
		dataType: "PASS" as EntityFieldDataType,
	},
	{
		name: "screenshotUrl",
		description: "launchSummary.screenshotLink",
		example: "url",
		dataType: "PASS" as EntityFieldDataType,
	},
	{
		name: "markdown",
		description: "allExtracts.fullMarkdown",
		example: "url",
		dataType: "PASS" as EntityFieldDataType,
	},
	{
		name: "metadata",
		description: "allExtracts.metadata",
		example: "url",
		dataType: "PASS" as EntityFieldDataType,
	},
	{
		name: "html",
		description: "allExtracts.fullHtml",
		example: "url",
		dataType: "PASS" as EntityFieldDataType,
	},
];

export interface ExtractionConfig {
	urls: string[];
	prompt?: string;
	mode: "run" | "submit";
	navigationMode: NavigationMode;
	name: string;
	location: {
		type: WorkflowWithCustomSchemaLocationTypeEnum;
	};
	pollingInterval: number;
	maxWaitTime: number;
	entity: string;
	fields: EntityField[];
	interval?: WorkflowInterval;
	monitoring?: MonitoringConfig;
	tags?: string[];
}

export type ExtractionOptions = {
	urls: string[];
} & Partial<Omit<ExtractionConfig, "urls">>;

export interface ExtractionResult {
	workflowId: string;
	workflow?: V4WorkflowsWorkflowIdGet200Response;
	data?: Array<object>;
	pagination?: PageInfo;
}

export interface SubmitExtractionResult {
	workflowId: string;
}

// Use TERMINAL_RUN_STATES from WorkflowsCoreService for consistency
const SUCCESSFUL_RUN_STATES = new Set(["FINISHED", "SUCCESS"]);

export const DEFAULT_OPTIONS: Omit<ExtractionConfig, "urls"> = {
	mode: "run",
	pollingInterval: 5000,
	maxWaitTime: 300000,
	navigationMode: "single-page" as const,
	location: { type: "auto" },
	name: "Untitled Workflow",
	entity: "page extraction",
	fields: TRANSIENT_WORKFLOW_SCHEMA,
} as const;
/**
 * Service for managing extraction workflows and data fetching
 */
export class ExtractionService {
	private readonly entityDetector: EntityDetectorService;
	private readonly workflowsCoreService: WorkflowsCoreService;
	private readonly dataFetcher: DataFetcherService;

	constructor(client: KadoaClient) {
		this.entityDetector = new EntityDetectorService(client);
		this.workflowsCoreService = new WorkflowsCoreService(client);
		this.dataFetcher = new DataFetcherService(client);
	}

	/**
	 * execute extraction workflow
	 */
	async executeExtraction(
		options: ExtractionOptions,
	): Promise<ExtractionResult | SubmitExtractionResult> {
		this.validateOptions(options);

		const config: ExtractionConfig = merge(DEFAULT_OPTIONS, options);

		try {
			let workflowId: string;
			if (options.mode === "run") {
				const result = await this.workflowsCoreService.create({
					...config,
					entity: "page extraction",
					fields: TRANSIENT_WORKFLOW_SCHEMA,
					interval: config.interval,
					monitoring: config.monitoring,
					location: config.location,
				});
				workflowId = result.id;
			} else {
				// Step 1: Detect entity fields
				const entityPrediction = await this.entityDetector.fetchEntityFields({
					link: config.urls[0],
					location: config.location,
					navigationMode: config.navigationMode,
				});

				// Step 2: Create workflow
				const result = await this.workflowsCoreService.create({
					...config,
					entity: entityPrediction.entity,
					fields: entityPrediction.fields,
					interval: config.interval,
					monitoring: config.monitoring,
					location: config.location,
				});
				workflowId = result.id;
			}

			if (options.mode === "submit") {
				return {
					workflowId,
				};
			}

			// Step 3: Wait for completion
			const workflow = await this.workflowsCoreService.wait(workflowId, {
				pollIntervalMs: config.pollingInterval,
				timeoutMs: config.maxWaitTime,
			});

			// Step 4: Fetch first page of data if successful
			let data: Array<object> | undefined;
			let pagination: PageInfo | undefined;
			const isSuccess = this.isExtractionSuccessful(workflow.runState);

			if (isSuccess) {
				const dataPage = await this.dataFetcher.fetchData({ workflowId });
				data = dataPage.data;
				pagination = dataPage.pagination;

				if (data) {
					const isPartial =
						pagination?.totalCount && data.length < pagination.totalCount;
				}
			} else {
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
