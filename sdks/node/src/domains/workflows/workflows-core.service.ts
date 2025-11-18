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
import type { AgenticWorkflow } from "../../generated";
import {
  type CreateWorkflowRequest,
  type CreateWorkflowWithCustomSchemaRequest,
  type GetJobResponse,
  type GetWorkflowResponse,
  JobStateEnum,
  type ListWorkflowsRequest,
  type MonitoringConfig,
  type RunWorkflowRequest,
  type RunWorkflowResponse,
  type UpdateWorkflowRequest,
  type UpdateWorkflowResponse,
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
  navigationMode: NavigationMode;
  name?: string;
  description?: string;
  schemaId?: string;
  entity?: string;
  fields: Array<SchemaField>;
  tags?: string[];
  interval?: WorkflowInterval;
  monitoring?: MonitoringConfig;
  location?: LocationConfig;
  bypassPreview?: boolean;
  autoStart?: boolean;
  schedules?: string[];
  additionalData?: Record<string, unknown>;
  userPrompt?: string;
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

    const domainName = new URL(input.urls[0]).hostname;

    // For agentic-navigation, use AgenticWorkflow type
    if (input.navigationMode === "agentic-navigation") {
      if (!input.userPrompt) {
        throw new KadoaSdkException(
          "userPrompt is required when navigationMode is 'agentic-navigation'",
          {
            code: "VALIDATION_ERROR",
            details: { navigationMode: input.navigationMode },
          },
        );
      }

      const agenticRequest: AgenticWorkflow = {
        urls: input.urls,
        navigationMode: "agentic-navigation",
        name: input.name ?? domainName,
        description: input.description,
        userPrompt: input.userPrompt,
        schemaId: input.schemaId,
        entity: input.entity,
        fields: input.fields,
        bypassPreview: input.bypassPreview ?? true,
        tags: input.tags,
        interval: input.interval,
        monitoring: input.monitoring,
        location: input.location,
        autoStart: input.autoStart,
        schedules: input.schedules,
        additionalData: input.additionalData,
      };

      const response = await this.workflowsApi.v4WorkflowsPost({
        createWorkflowBody: agenticRequest,
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

    const request:
      | CreateWorkflowRequest
      | CreateWorkflowWithCustomSchemaRequest = {
      urls: input.urls,
      name: input.name ?? domainName,
      schemaId: input.schemaId,
      description: input.description,
      navigationMode: input.navigationMode,
      entity: input.entity ?? "",
      fields: input.fields,
      bypassPreview: input.bypassPreview ?? true,
      tags: input.tags,
      interval: input.interval,
      monitoring: input.monitoring,
      location: input.location,
      autoStart: input.autoStart,
      schedules: input.schedules,
      additionalData: input.additionalData,
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
   * @deprecated Use delete(id) instead.
   */
  async cancel(id: WorkflowId): Promise<void> {
    console.warn(
      "[Kadoa SDK] workflow.cancel(id) will be deprecated. Use workflow.delete(id).",
    );
    await this.delete(id);
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
    let last: GetWorkflowResponse | undefined;

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
    let last: GetJobResponse | undefined;

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
