import { getWorkflowsApi } from "../api-client";
import type { EventPayloadMap } from "../events/event-types";
import { KadoaSdkException } from "../exceptions/kadoa-sdk.exception";
import { wrapKadoaError } from "../exceptions/utils";
import type {
	V4WorkflowsPostRequest,
	V4WorkflowsWorkflowIdGet200Response,
} from "../generated";
import type { KadoaSDK } from "../kadoa-sdk";
import { ERROR_MESSAGES, TERMINAL_RUN_STATES } from "./constants";
import type { EntityField, ExtractionConfig } from "./types";

/**
 * Check if a workflow runState is terminal (finished processing)
 */
export function isTerminalRunState(runState: string | undefined): boolean {
	if (!runState) return false;
	return TERMINAL_RUN_STATES.has(runState.toUpperCase());
}

/**
 * Creates a new workflow with the provided configuration
 */
export async function createWorkflow(
	sdkInstance: KadoaSDK,
	config: ExtractionConfig & {
		entity: string;
		fields: EntityField[];
	},
): Promise<string> {
	const workflowsApi = getWorkflowsApi(sdkInstance);

	const request: V4WorkflowsPostRequest = {
		urls: config.urls,
		navigationMode: config.navigationMode,
		entity: config.entity,
		name: config.name,
		fields: config.fields,
		bypassPreview: true,
		limit: config.maxRecords,
		tags: ["sdk"],
	};

	try {
		const response = await workflowsApi.v4WorkflowsPost({
			v4WorkflowsPostRequest: request,
		});

		const workflowId = response.data.workflowId;

		if (!workflowId) {
			throw new KadoaSdkException(ERROR_MESSAGES.NO_WORKFLOW_ID, {
				code: "INTERNAL_ERROR",
				details: { urls: config.urls },
			});
		}

		return workflowId;
	} catch (error) {
		throw wrapKadoaError(error, {
			message: "Failed to create workflow",
			details: config as Record<any, any>,
		});
	}
}

/**
 * Gets the current status of a workflow
 */
export async function getWorkflowStatus(
	sdkInstance: KadoaSDK,
	workflowId: string,
): Promise<V4WorkflowsWorkflowIdGet200Response> {
	const workflowsApi = getWorkflowsApi(sdkInstance);

	try {
		const response = await workflowsApi.v4WorkflowsWorkflowIdGet({
			workflowId,
		});
		return response.data;
	} catch (error) {
		throw wrapKadoaError(error, {
			message: ERROR_MESSAGES.PROGRESS_CHECK_FAILED,
			details: { workflowId },
		});
	}
}

/**
 * Poll workflow status until it reaches a terminal state
 */
export async function waitForWorkflowCompletion(
	sdkInstance: KadoaSDK,
	workflowId: string,
	options: ExtractionConfig & {
		pollingInterval: number;
		maxWaitTime: number;
		onStatusChange?: (
			change: EventPayloadMap["extraction:status_changed"],
		) => void;
	},
): Promise<V4WorkflowsWorkflowIdGet200Response> {
	const pollingInterval = options.pollingInterval;
	const maxWaitTime = options.maxWaitTime;
	const startTime = Date.now();

	let previousState: string | undefined;
	let previousRunState: string | undefined;

	while (Date.now() - startTime < maxWaitTime) {
		const workflow = await getWorkflowStatus(sdkInstance, workflowId);

		if (
			workflow.state !== previousState ||
			workflow.runState !== previousRunState
		) {
			const statusChange: EventPayloadMap["extraction:status_changed"] = {
				workflowId,
				previousState,
				previousRunState,
				currentState: workflow.state,
				currentRunState: workflow.runState,
			};

			sdkInstance.emit("extraction:status_changed", statusChange, "extraction");

			if (options?.onStatusChange) {
				options.onStatusChange(statusChange);
			}

			previousState = workflow.state;
			previousRunState = workflow.runState;
		}

		if (isTerminalRunState(workflow.runState)) {
			return workflow;
		}

		await new Promise((resolve) => setTimeout(resolve, pollingInterval));
	}

	throw new KadoaSdkException(
		`Extraction did not complete within ${maxWaitTime / 1000} seconds`,
		{ code: "TIMEOUT", details: { workflowId, maxWaitTime } },
	);
}
