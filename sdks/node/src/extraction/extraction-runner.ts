import { merge } from "es-toolkit/object";
import { KadoaSdkException } from "../exceptions/kadoa-sdk.exception";
import { wrapKadoaError } from "../exceptions/utils";
import type { KadoaSDK } from "../kadoa-sdk";
import {
	DEFAULT_OPTIONS,
	ERROR_MESSAGES,
	SUCCESSFUL_RUN_STATES,
} from "./constants";
import { fetchWorkflowData } from "./data-fetcher";
import { fetchEntityFields } from "./entity-detector";
import type {
	ExtractionConfig,
	ExtractionOptions,
	ExtractionResult,
} from "./types";
import {
	createWorkflow,
	isTerminalRunState,
	waitForWorkflowCompletion,
} from "./workflow-manager";

/**
 * Validates extraction options
 */
function validateExtractionOptions(options: ExtractionOptions): void {
	if (!options.urls || options.urls.length === 0) {
		throw new KadoaSdkException(ERROR_MESSAGES.NO_URLS, {
			code: "VALIDATION_ERROR",
		});
	}
}

/**
 * Checks if extraction was successful
 */
function isExtractionSuccessful(runState: string | undefined): boolean {
	return runState ? SUCCESSFUL_RUN_STATES.has(runState.toUpperCase()) : false;
}

/**
 * Run extraction workflow using dynamic entity detection
 *
 * @param sdkInstance The Kadoa SDK instance
 * @param options Extraction configuration options
 * @returns ExtractionResult containing workflow ID, workflow details, and extracted data
 */
export async function runExtraction(
	sdkInstance: KadoaSDK,
	options: ExtractionOptions,
): Promise<ExtractionResult> {
	validateExtractionOptions(options);

	const config: ExtractionConfig = merge(
		DEFAULT_OPTIONS,
		options,
	) as ExtractionConfig;

	try {
		// Step 1: Detect entity fields
		const entityPrediction = await fetchEntityFields(sdkInstance, {
			link: config.urls[0],
			location: config.location,
			navigationMode: config.navigationMode,
		});

		sdkInstance.emit(
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
		const workflowId = await createWorkflow(sdkInstance, {
			entity: entityPrediction.entity,
			fields: entityPrediction.fields,
			...config,
		});

		sdkInstance.emit(
			"extraction:started",
			{
				workflowId,
				name: config.name,
				urls: config.urls,
			},
			"extraction",
		);

		// Step 3: Wait for completion
		const workflow = await waitForWorkflowCompletion(sdkInstance, workflowId, {
			...config,
			pollingInterval: config.pollingInterval,
			maxWaitTime: config.maxWaitTime,
		});

		// Step 4: Fetch data if successful
		let data: Array<object> | undefined;
		const isSuccess = isExtractionSuccessful(workflow.runState);

		if (isSuccess) {
			data = await fetchWorkflowData(sdkInstance, workflowId);

			if (data) {
				sdkInstance.emit(
					"extraction:data_available",
					{
						workflowId,
						recordCount: data.length,
						isPartial: false,
					},
					"extraction",
				);
			}

			sdkInstance.emit(
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
			sdkInstance.emit(
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
				`Extraction completed with unexpected status: ${workflow.runState}`,
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
		throw wrapKadoaError(error, {
			message: ERROR_MESSAGES.EXTRACTION_FAILED,
			details: { urls: options.urls },
		});
	}
}

// Re-export helper for checking terminal states
export { isTerminalRunState };
