import type {
	V4WorkflowsGet200ResponseWorkflowsInner,
	V4WorkflowsPostRequest,
	V4WorkflowsWorkflowIdGet200Response,
	WorkflowsApiV4WorkflowsGetRequest,
} from "../../../generated";
import { KadoaSdkException } from "../../runtime/exceptions";
import { ERROR_MESSAGES } from "../../runtime/exceptions/base.exception";
import type { ApiProvider } from "../../runtime/http/api-provider";
import { pollUntil } from "../../runtime/utils";
import type {
	CreateWorkflowInput,
	WaitOptions,
	WorkflowState,
	WorkflowId,
	WorkflowsCoreServiceInterface,
} from "./types";
import { logger } from "../../runtime/logger";

export type ListWorkflowsOptions = WorkflowsApiV4WorkflowsGetRequest;

const TERMINAL_RUN_STATES: Set<WorkflowState> = new Set([
	"FINISHED",
	"SUCCESS",
	"FAILED",
	"ERROR",
	"STOPPED",
	"CANCELLED",
]);

const debug = logger.workflow;

export class WorkflowsCoreService implements WorkflowsCoreServiceInterface {
	constructor(private readonly client: ApiProvider) {}

	async create(input: CreateWorkflowInput): Promise<{ id: WorkflowId }> {
		const request: V4WorkflowsPostRequest = {
			urls: input.urls,
			navigationMode: input.navigationMode,
			entity: input.entity,
			name: input.name,
			fields: input.fields as any, //todo: fix this
			bypassPreview: input.bypassPreview ?? true,
			tags: input.tags,
			interval: input.interval,
			monitoring: input.monitoring,
			location: input.location,
		};

		const response = await this.client.workflows.v4WorkflowsPost({
			v4WorkflowsPostRequest: request,
		});
		const workflowId = response.data?.workflowId;

		if (!workflowId) {
			throw new KadoaSdkException(ERROR_MESSAGES.NO_WORKFLOW_ID, {
				code: "INTERNAL_ERROR",
				details: {
					response: response.data,
				},
			});
		}
		return { id: workflowId };
	}

	async get(id: WorkflowId): Promise<V4WorkflowsWorkflowIdGet200Response> {
		const response = await this.client.workflows.v4WorkflowsWorkflowIdGet({
			workflowId: id,
		});
		return response.data;
	}

	async list(
		filters?: ListWorkflowsOptions,
	): Promise<V4WorkflowsGet200ResponseWorkflowsInner[]> {
		const response = await this.client.workflows.v4WorkflowsGet(filters);
		return response.data?.workflows ?? [];
	}

	async getByName(
		name: string,
	): Promise<V4WorkflowsGet200ResponseWorkflowsInner | undefined> {
		const response = await this.client.workflows.v4WorkflowsGet({
			search: name,
		});
		return response.data?.workflows?.[0];
	}

	async cancel(id: WorkflowId): Promise<void> {
		await this.client.workflows.v4WorkflowsWorkflowIdDelete({
			workflowId: id,
		});
	}

	async resume(id: WorkflowId): Promise<void> {
		await this.client.workflows.v4WorkflowsWorkflowIdResumePut({
			workflowId: id,
		});
	}

	/**
	 * Wait for a workflow to reach the target state or a terminal state if no target state is provided
	 */
	async wait(
		id: WorkflowId,
		options?: WaitOptions,
	): Promise<V4WorkflowsWorkflowIdGet200Response> {
		let last: V4WorkflowsWorkflowIdGet200Response | undefined;

		const result = await pollUntil(
			async () => {
				const current = await this.get(id);

				// Log state changes
				if (
					last?.state !== current.state ||
					last?.runState !== current.runState
				) {
					debug(
						"workflow %s state: [workflowState: %s, jobState: %s]",
						id,
						current.state,
						current.runState,
					);
				}

				last = current;
				return current;
			},
			(current) => {
				// Check for target state if specified
				if (options?.targetState && current.state === options.targetState) {
					return true;
				}

				// Check for terminal states
				if (
					current.runState &&
					TERMINAL_RUN_STATES.has(current.runState.toUpperCase()) &&
					current.state !== "QUEUED"
				) {
					return true;
				}

				return false;
			},
			options,
		);

		return result.result;
	}
}
