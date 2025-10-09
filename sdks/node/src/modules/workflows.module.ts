import type {
  V4WorkflowsGet200ResponseWorkflowsInner,
  V4WorkflowsWorkflowIdGet200Response,
} from "../generated";
import type {
  FinishedJob,
  JobWaitOptions,
  WorkflowId,
  CreateWorkflowInput,
} from "../internal/domains/workflows/types";
import type {
  ListWorkflowsOptions,
  WorkflowsCoreService,
} from "../internal/domains/workflows/workflows-core.service";

export interface SubmitOptions {
  idempotencyKey?: string;
}

export interface WaitOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export class WorkflowsModule {
  constructor(private readonly core: WorkflowsCoreService) {}

  async get(workflowId: string): Promise<V4WorkflowsWorkflowIdGet200Response> {
    return this.core.get(workflowId);
  }

  async list(
    filters?: ListWorkflowsOptions,
  ): Promise<V4WorkflowsGet200ResponseWorkflowsInner[]> {
    return this.core.list(filters);
  }

  async getByName(
    name: string,
  ): Promise<V4WorkflowsGet200ResponseWorkflowsInner | undefined> {
    return this.core.getByName(name);
  }

  async create(input: CreateWorkflowInput): Promise<{ id: WorkflowId }> {
    return this.core.create(input);
  }

  async cancel(workflowId: string): Promise<void> {
    return this.core.cancel(workflowId);
  }

  async approve(workflowId: string): Promise<void> {
    return this.core.resume(workflowId);
  }

  async resume(workflowId: string): Promise<void> {
    return this.core.resume(workflowId);
  }

  async wait(
    workflowId: string,
    options?: WaitOptions,
  ): Promise<V4WorkflowsWorkflowIdGet200Response> {
    return this.core.wait(workflowId, options);
  }

  /**
   * Get job status directly without polling workflow details
   */
  async getJobStatus(workflowId: string, jobId: string): Promise<FinishedJob> {
    return this.core.getJobStatus(workflowId, jobId);
  }

  /**
   * Wait for a job to complete using the job status endpoint
   */
  async waitForJobCompletion(
    workflowId: string,
    jobId: string,
    options?: JobWaitOptions,
  ): Promise<FinishedJob> {
    return this.core.waitForJobCompletion(workflowId, jobId, options);
  }
}
