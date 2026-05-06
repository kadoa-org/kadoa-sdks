import { KadoaSdkException } from "../../runtime/exceptions";
import { ERROR_MESSAGES } from "../../runtime/exceptions/base.exception";
import { logger } from "../../runtime/logger";
import {
  type PollingOptions,
  pollUntil,
  validateAdditionalData,
} from "../../runtime/utils";
import type {
  LocationConfig,
  NavigationMode,
  SchemaField,
  WorkflowInterval,
} from "../extraction/extraction.acl";
import {
  type GetJobResponse,
  type GetWorkflowResponse,
  JobStateEnum,
  type ListWorkflowsRequest,
  type MonitoringConfig,
  type PromptWorkflow,
  type RunWorkflowRequest,
  type RunWorkflowResponse,
  type UpdateWorkflowRequest,
  type UpdateWorkflowResponse,
  type WorkflowAuditLogOptions,
  type WorkflowAuditLogResponse,
  type WorkflowResponse,
  type WorkflowStateEnum,
  type WorkflowsApiInterface,
} from "./workflows.acl";

export type WorkflowId = string;
export type JobId = string;

export interface WaitOptions extends PollingOptions {
  targetState?: WorkflowStateEnum;
}

export interface JobWaitOptions extends PollingOptions {
  targetStatus?: JobStateEnum;
}

export interface CreateWorkflowInput {
  urls: string[];
  /**
   * Natural-language instructions for the workflow (10–5000 chars).
   * Required by the backend on every create — navigation is inferred from the prompt.
   */
  userPrompt: string;
  name?: string;
  description?: string;
  schemaId?: string;
  entity?: string;
  fields?: Array<SchemaField>;
  tags?: string[];
  interval?: WorkflowInterval;
  monitoring?: MonitoringConfig;
  location?: LocationConfig;
  bypassPreview?: boolean;
  schedules?: string[];
  additionalData?: Record<string, unknown>;
  limit?: number;
  /**
   * @deprecated The backend no longer accepts a `navigationMode` field —
   * navigation is inferred from `userPrompt`. Kept on the SDK input shape
   * for backwards compatibility; the value is ignored.
   */
  navigationMode?: NavigationMode;
  /**
   * @deprecated The backend no longer accepts an `autoStart` field on create.
   * Kept on the SDK input shape for backwards compatibility; the value is ignored.
   */
  autoStart?: boolean;
}

export const TERMINAL_JOB_STATES: Set<JobStateEnum> = new Set([
  JobStateEnum.Finished,
  JobStateEnum.Failed,
  JobStateEnum.NotSupported,
  JobStateEnum.FailedInsufficientFunds,
]);

export const TERMINAL_RUN_STATES: Set<string> = new Set([
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
    validateAdditionalData(input.additionalData);

    if (!input.userPrompt) {
      throw new KadoaSdkException(
        "userPrompt is required to create a workflow",
        {
          code: "VALIDATION_ERROR",
          details: { urls: input.urls },
        },
      );
    }

    const domainName = new URL(input.urls[0]).hostname;

    // The OpenAPI spec dropped `navigationMode` when it consolidated the
    // create-workflow body into `PublicWorkflowCreateRequest`, but the
    // public-api handler still uses `detectWorkflowType` to route based
    // on it (with a fallback that misroutes prompt-based workflows). Send
    // it explicitly so the backend dispatches to the agentic branch.
    const request = {
      urls: input.urls,
      name: input.name ?? domainName,
      description: input.description,
      userPrompt: input.userPrompt,
      navigationMode: "agentic-navigation",
      schemaId: input.schemaId,
      ...(input.entity != null && { entity: input.entity }),
      fields: input.fields,
      bypassPreview: input.bypassPreview ?? true,
      tags: input.tags,
      interval: input.interval,
      monitoring: input.monitoring,
      location: input.location,
      schedules: input.schedules,
      additionalData: input.additionalData,
      limit: input.limit,
    } as PromptWorkflow;

    const response = await this.workflowsApi.v4WorkflowsPost({
      publicWorkflowCreateRequest: request,
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

  async get(id: WorkflowId): Promise<GetWorkflowResponse> {
    const response = await this.workflowsApi.v4WorkflowsWorkflowIdGet({
      workflowId: id,
    });
    return response.data as GetWorkflowResponse;
  }

  async list(filters?: ListWorkflowsRequest): Promise<WorkflowResponse[]> {
    const response = await this.workflowsApi.v4WorkflowsGet(filters);
    return (response.data?.workflows ?? []) as WorkflowResponse[];
  }

  async getByName(name: string): Promise<WorkflowResponse | undefined> {
    const response = await this.workflowsApi.v4WorkflowsGet({
      search: name,
    });
    return response.data?.workflows?.[0] as WorkflowResponse | undefined;
  }

  /**
   * Get the configuration revision history (audit log) for a workflow.
   * Each entry captures who changed the workflow, when, from which channel
   * (UI/API/SDK/MCP/CLI/SYSTEM), and full before/after snapshots for UPDATE
   * operations. CREATE entries have null `previousValue`/`newValue`.
   */
  async getAuditLog(
    id: WorkflowId,
    options?: WorkflowAuditLogOptions,
  ): Promise<WorkflowAuditLogResponse> {
    const response = await this.workflowsApi.v5WorkflowsWorkflowIdAuditlogGet({
      workflowId: id,
      page: options?.page,
      limit: options?.limit,
    });
    return response.data;
  }

  async delete(id: WorkflowId): Promise<void> {
    await this.workflowsApi.v4WorkflowsWorkflowIdDelete({
      workflowId: id,
    });
  }

  async update(
    id: WorkflowId,
    input: UpdateWorkflowRequest,
  ): Promise<UpdateWorkflowResponse> {
    validateAdditionalData(input.additionalData);

    const response = await this.workflowsApi.v4WorkflowsWorkflowIdMetadataPut({
      workflowId: id,
      v4WorkflowsWorkflowIdMetadataPutRequest: input,
    });
    return response.data;
  }

  async pause(id: WorkflowId): Promise<void> {
    await this.workflowsApi.v4WorkflowsWorkflowIdPausePut({
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
  ): Promise<GetWorkflowResponse> {
    const result = await pollUntil(
      async () => {
        const current = await this.get(id);

        debug("workflow %s state: %s", id, current.runState);

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
    input: RunWorkflowRequest,
  ): Promise<RunWorkflowResponse> {
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
  ): Promise<GetJobResponse> {
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
  ): Promise<GetJobResponse> {
    const result = await pollUntil(
      async () => {
        const current = await this.getJobStatus(workflowId, jobId);

        debug("workflow run %s state: %s", jobId, current.state);

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
