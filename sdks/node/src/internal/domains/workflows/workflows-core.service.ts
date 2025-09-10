import type {
	V4WorkflowsPostRequest,
	V4WorkflowsWorkflowIdGet200Response,
} from "../../../generated";
import type { WorkflowWithCustomSchemaFieldsInner } from "../../../generated/models/workflow-with-custom-schema-fields-inner";
import {
	KadoaHttpException,
	KadoaSdkException,
} from "../../runtime/exceptions";
import { ERROR_MESSAGES } from "../../runtime/exceptions/base.exception";
import type { ApiProvider } from "../../runtime/http/api-provider";
import type {
	CreateWorkflowInput,
	WaitOptions,
	WorkflowId,
	WorkflowsCoreServiceInterface,
} from "./types";

const TERMINAL_RUN_STATES = new Set([
	"FINISHED",
	"SUCCESS",
	"FAILED",
	"ERROR",
	"STOPPED",
	"CANCELLED",
]);

export class WorkflowsCoreService implements WorkflowsCoreServiceInterface {
	constructor(private readonly client: ApiProvider) {}

	async create(
		input: CreateWorkflowInput,
		_idempotencyKey?: string,
	): Promise<{ id: WorkflowId }> {
		const request: V4WorkflowsPostRequest = {
			urls: input.urls,
			navigationMode: input.navigationMode as unknown as any,
			entity: input.entity,
			name: input.name,
			fields:
				input.fields as unknown as Array<WorkflowWithCustomSchemaFieldsInner>,
			bypassPreview: true,
			tags: input.tags ?? ["sdk"],
		};

		try {
			const response = await this.client.workflows.v4WorkflowsPost({
				v4WorkflowsPostRequest: request,
			});
			const workflowId = (
				response as unknown as { data?: { workflowId?: string } }
			).data?.workflowId;
			if (!workflowId) {
				throw new KadoaSdkException(ERROR_MESSAGES.NO_WORKFLOW_ID, {
					code: "INTERNAL_ERROR",
					details: {
						response: (response as unknown as { data?: unknown }).data,
					},
				});
			}
			return { id: workflowId };
		} catch (error) {
			throw KadoaHttpException.wrap(error, {
				message: ERROR_MESSAGES.WORKFLOW_CREATE_FAILED,
				details: request as unknown as Record<string, unknown>,
			});
		}
	}

	async get(id: WorkflowId): Promise<V4WorkflowsWorkflowIdGet200Response> {
		try {
			const response = await this.client.workflows.v4WorkflowsWorkflowIdGet({
				workflowId: id,
			});
			return response.data;
		} catch (error) {
			throw KadoaHttpException.wrap(error, {
				message: ERROR_MESSAGES.PROGRESS_CHECK_FAILED,
				details: { workflowId: id },
			});
		}
	}

	async cancel(id: WorkflowId): Promise<void> {
		try {
			await this.client.workflows.v4WorkflowsWorkflowIdDelete({
				workflowId: id,
			});
		} catch (error) {
			throw KadoaHttpException.wrap(error, {
				message: ERROR_MESSAGES.WORKFLOW_CREATE_FAILED,
				details: { workflowId: id },
			});
		}
	}

	async wait(
		id: WorkflowId,
		options?: WaitOptions,
	): Promise<V4WorkflowsWorkflowIdGet200Response> {
		const pollInterval = Math.max(250, options?.pollIntervalMs ?? 1000);
		const timeoutMs = options?.timeoutMs ?? 5 * 60 * 1000;
		const start = Date.now();
		let last: V4WorkflowsWorkflowIdGet200Response | undefined;

		while (Date.now() - start < timeoutMs) {
			if (options?.abortSignal?.aborted) {
				throw new KadoaSdkException("Aborted");
			}

			const current = await this.get(id);
			if (
				last?.state !== current.state ||
				last?.runState !== current.runState
			) {
				// Internal: we could emit an event via client if needed in the future
			}
			if (
				current.runState &&
				TERMINAL_RUN_STATES.has(current.runState.toUpperCase())
			) {
				return current;
			}
			last = current;
			await new Promise((r) => setTimeout(r, pollInterval));
		}

		throw new KadoaSdkException(ERROR_MESSAGES.WORKFLOW_TIMEOUT, {
			details: {
				workflowId: id,
				lastState: last?.state,
				lastRunState: last?.runState,
				timeoutMs,
			},
		});
	}
}
