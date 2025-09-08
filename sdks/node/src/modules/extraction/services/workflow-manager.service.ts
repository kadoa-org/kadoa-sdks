import type { EventPayloadMap } from "../../../core/events";
import {
	KadoaHttpException,
	KadoaSdkException,
} from "../../../core/exceptions";
import { ERROR_MESSAGES } from "../../../core/exceptions/base.exception";
import { getWorkflowsApi } from "../../../core/http";
import type {
	V4WorkflowsPostRequest,
	V4WorkflowsWorkflowIdGet200Response,
} from "../../../generated";
import type { KadoaClient } from "../../../kadoa-client";
import type { EntityField, ExtractionConfig } from "../extraction.types";

/**
 * Workflow state constants
 */
export const TERMINAL_RUN_STATES = new Set([
	"FINISHED",
	"SUCCESS",
	"FAILED",
	"ERROR",
	"STOPPED",
	"CANCELLED",
]);

/**
 * Service for managing extraction workflows
 */
export class WorkflowManagerService {
	constructor(private readonly client: KadoaClient) {}

	/**
	 * Check if a workflow runState is terminal (finished processing)
	 */
	isTerminalRunState(runState: string | undefined): boolean {
		if (!runState) return false;
		return TERMINAL_RUN_STATES.has(runState.toUpperCase());
	}

	/**
	 * Creates a new workflow with the provided configuration
	 */
	async createWorkflow(
		config: ExtractionConfig & {
			entity: string;
			fields: EntityField[];
		},
	): Promise<string> {
		const workflowsApi = getWorkflowsApi(this.client);

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
					details: { response: response.data },
				});
			}

			return workflowId;
		} catch (error) {
			throw KadoaHttpException.wrap(error, {
				message: ERROR_MESSAGES.WORKFLOW_CREATE_FAILED,
				details: config as unknown as Record<string, unknown>,
			});
		}
	}

	/**
	 * Gets the current status of a workflow
	 */
	async getWorkflowStatus(
		workflowId: string,
	): Promise<V4WorkflowsWorkflowIdGet200Response> {
		const workflowsApi = getWorkflowsApi(this.client);

		try {
			const response = await workflowsApi.v4WorkflowsWorkflowIdGet({
				workflowId,
			});
			return response.data;
		} catch (error) {
			throw KadoaHttpException.wrap(error, {
				message: ERROR_MESSAGES.PROGRESS_CHECK_FAILED,
				details: { workflowId },
			});
		}
	}

	/**
	 * Waits for a workflow to complete processing
	 *
	 * @param workflowId The workflow ID to monitor
	 * @param pollingInterval How often to check the status (in milliseconds)
	 * @param maxWaitTime Maximum time to wait before timing out (in milliseconds)
	 * @param onStatusChange Optional callback for status changes
	 * @returns The final workflow status
	 */
	async waitForWorkflowCompletion(
		workflowId: string,
		pollingInterval: number,
		maxWaitTime: number,
		onStatusChange?: (
			previousStatus: V4WorkflowsWorkflowIdGet200Response | undefined,
			currentStatus: V4WorkflowsWorkflowIdGet200Response,
		) => void,
	): Promise<V4WorkflowsWorkflowIdGet200Response> {
		const startTime = Date.now();
		let lastStatus: V4WorkflowsWorkflowIdGet200Response | undefined;

		while (Date.now() - startTime < maxWaitTime) {
			const currentStatus = await this.getWorkflowStatus(workflowId);

			if (
				lastStatus?.state !== currentStatus.state ||
				lastStatus?.runState !== currentStatus.runState
			) {
				const eventPayload: EventPayloadMap["extraction:status_changed"] = {
					workflowId,
					previousState: lastStatus?.state,
					previousRunState: lastStatus?.runState,
					currentState: currentStatus.state,
					currentRunState: currentStatus.runState,
				};
				this.client.emit(
					"extraction:status_changed",
					eventPayload,
					"extraction",
				);

				if (onStatusChange) {
					onStatusChange(lastStatus, currentStatus);
				}
			}

			if (this.isTerminalRunState(currentStatus.runState)) {
				return currentStatus;
			}

			lastStatus = currentStatus;

			await new Promise((resolve) => setTimeout(resolve, pollingInterval));
		}

		throw new KadoaSdkException(ERROR_MESSAGES.WORKFLOW_TIMEOUT, {
			code: "TIMEOUT",
			details: {
				workflowId,
				maxWaitTime,
				lastState: lastStatus?.state,
				lastRunState: lastStatus?.runState,
			},
		});
	}
}
