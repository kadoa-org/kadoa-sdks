import { merge } from "es-toolkit/object";
import {
	KadoaHttpException,
	KadoaSdkException,
} from "../../../core/exceptions";
import { ERROR_MESSAGES } from "../../../core/exceptions/base.exception";
import { Command } from "../../../core/patterns";
import type { KadoaClient } from "../../../kadoa-client";
import type {
	ExtractionConfig,
	ExtractionOptions,
	ExtractionResult,
} from "../extraction.types";
import { DataFetcherService } from "../services/data-fetcher.service";
import { EntityDetectorService } from "../services/entity-detector.service";
import { WorkflowManagerService } from "../services/workflow-manager.service";

export const SUCCESSFUL_RUN_STATES = new Set(["FINISHED", "SUCCESS"]);

export const DEFAULT_OPTIONS: Omit<ExtractionConfig, "urls"> = {
	pollingInterval: 5000,
	maxWaitTime: 300000,
	navigationMode: "single-page" as const,
	location: { type: "auto" },
	name: "Untitled Workflow",
	maxRecords: 1000,
} as const;

/**
 * Command to run the extraction workflow
 */
export class RunExtractionCommand extends Command<
	ExtractionResult,
	ExtractionOptions
> {
	private readonly dataFetcher: DataFetcherService;
	private readonly entityDetector: EntityDetectorService;
	private readonly workflowManager: WorkflowManagerService;

	constructor(private readonly client: KadoaClient) {
		super();
		this.dataFetcher = new DataFetcherService(client);
		this.entityDetector = new EntityDetectorService(client);
		this.workflowManager = new WorkflowManagerService(client);
	}

	/**
	 * Execute the extraction workflow
	 */
	async execute(options: ExtractionOptions): Promise<ExtractionResult> {
		this.validateOptions(options);

		const config: ExtractionConfig = merge(
			DEFAULT_OPTIONS,
			options,
		) as ExtractionConfig;

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

			// Step 3: Wait for completion
			const workflow = await this.workflowManager.waitForWorkflowCompletion(
				workflowId,
				config.pollingInterval,
				config.maxWaitTime,
			);

			// Step 4: Fetch data if successful
			let data: Array<object> | undefined;
			const isSuccess = this.isExtractionSuccessful(workflow.runState);

			if (isSuccess) {
				data = await this.dataFetcher.fetchWorkflowData(
					workflowId,
					config.maxRecords,
				);

				if (data) {
					this.client.emit(
						"extraction:data_available",
						{
							workflowId,
							recordCount: data.length,
							isPartial: false,
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
	 * @private
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
	 * @private
	 */
	private isExtractionSuccessful(runState: string | undefined): boolean {
		return runState ? SUCCESSFUL_RUN_STATES.has(runState.toUpperCase()) : false;
	}
}
