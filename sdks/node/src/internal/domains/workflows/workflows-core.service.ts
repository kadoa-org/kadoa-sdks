import type {
	CreateWorkflowWithCustomSchemaBody,
	CreateWorkflowWithSchemaBody,
	V4WorkflowsGet200ResponseWorkflowsInner,
	V4WorkflowsWorkflowIdGet200Response,
	WorkflowsApiInterface,
	WorkflowsApiV4WorkflowsGetRequest,
} from "../../../generated";
import { KadoaSdkException } from "../../runtime/exceptions";
import { ERROR_MESSAGES } from "../../runtime/exceptions/base.exception";
import { pollUntil } from "../../runtime/utils";
import type {
	CreateWorkflowInput,
	JobId,
	FinishedJob,
	JobWaitOptions,
	RunWorkflowInput,
	StartedJob,
	WaitOptions,
	WorkflowId,
	WorkflowState,
} from "./types";
import { TERMINAL_JOB_STATES } from "./types";
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

export class WorkflowsCoreService {
	constructor(private readonly workflowsApi: WorkflowsApiInterface) {}

	async create(input: CreateWorkflowInput): Promise<{ id: WorkflowId }> {
		const request:
			| CreateWorkflowWithSchemaBody
			| CreateWorkflowWithCustomSchemaBody = {
			urls: input.urls,
			name: input.name,
			schemaId: input.schemaId,
			description: input.description,
			navigationMode: input.navigationMode,
			entity: input.entity,
			fields: input.fields,
			bypassPreview: input.bypassPreview ?? true,
			tags: input.tags,
			interval: input.interval,
			monitoring: input.monitoring,
			location: input.location,
			autoStart: input.autoStart,
			schedules: input.schedules,
		};

		const response = await this.workflowsApi.v4WorkflowsPost({
			createWorkflowBody: request,
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
		const response = await this.workflowsApi.v4WorkflowsWorkflowIdGet({
			workflowId: id,
		});
		return response.data;
	}

	async list(
		filters?: ListWorkflowsOptions,
	): Promise<V4WorkflowsGet200ResponseWorkflowsInner[]> {
		const response = await this.workflowsApi.v4WorkflowsGet(filters);
		return response.data?.workflows ?? [];
	}

	async getByName(
		name: string,
	): Promise<V4WorkflowsGet200ResponseWorkflowsInner | undefined> {
		const response = await this.workflowsApi.v4WorkflowsGet({
			search: name,
		});
		return response.data?.workflows?.[0];
	}

	async cancel(id: WorkflowId): Promise<void> {
		await this.workflowsApi.v4WorkflowsWorkflowIdDelete({
			workflowId: id,
		});
	}

	async resume(id: WorkflowId): Promise<void> {
		await this.workflowsApi.v4WorkflowsWorkflowIdResumePut({
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

	/**
	 * Run a workflow with variables and optional limit
	 */
	async runWorkflow(
		workflowId: WorkflowId,
		input: RunWorkflowInput,
	): Promise<StartedJob> {
		const response = await this.workflowsApi.v4WorkflowsWorkflowIdRunPut({
			workflowId,
			v4WorkflowsWorkflowIdRunPutRequest: {
				variables: input.variables,
				limit: input.limit,
			},
		});

		const jobId = response.data?.jobId;
		if (!jobId) {
			throw new KadoaSdkException(ERROR_MESSAGES.NO_WORKFLOW_ID, {
				code: "INTERNAL_ERROR",
				details: {
					response: response.data,
				},
			});
		}

		return {
			jobId,
			message: response.data?.message,
			status: response.data?.status,
		};
	}

	/**
	 * Get job status directly without polling workflow details
	 */
	async getJobStatus(
		workflowId: WorkflowId,
		jobId: JobId,
	): Promise<FinishedJob> {
		const response = await this.workflowsApi.v4WorkflowsWorkflowIdJobsJobIdGet({
			workflowId,
			jobId,
		});
		return response.data;
	}

	/**
	 * Wait for a job to reach the target state or a terminal state
	 */
	async waitForJobCompletion(
		workflowId: WorkflowId,
		jobId: JobId,
		options?: JobWaitOptions,
	): Promise<FinishedJob> {
		let last: FinishedJob | undefined;

		const result = await pollUntil(
			async () => {
				const current = await this.getJobStatus(workflowId, jobId);

				// Log state changes
				if (last?.state !== current.state) {
					debug("job %s state: %s", jobId, current.state);
				}

				last = current;
				return current;
			},
			(current) => {
				// Check for target state if specified
				if (options?.targetStatus && current.state === options.targetStatus) {
					return true;
				}

				// Check for terminal states
				if (current.state && TERMINAL_JOB_STATES.has(current.state)) {
					return true;
				}

				return false;
			},
			options,
		);

		return result.result;
	}
}
