import type {
	V4WorkflowsGet200ResponseWorkflowsInner,
	V4WorkflowsWorkflowIdGet200Response,
} from "../generated";
import type { CreateWorkflowInput } from "../internal/domains/workflows/types";
import { WorkflowsCoreService } from "../internal/domains/workflows/workflows-core.service";
import type { KadoaClient } from "../kadoa-client";

export interface SubmitOptions {
	idempotencyKey?: string;
}

export interface WaitOptions {
	pollIntervalMs?: number;
	timeoutMs?: number;
}

export class WorkflowsModule {
	private readonly core: WorkflowsCoreService;

	constructor(client: KadoaClient) {
		this.core = new WorkflowsCoreService(client);
	}

	async submit(input: CreateWorkflowInput): Promise<{ workflowId: string }> {
		const { id } = await this.core.create(input);
		return { workflowId: id };
	}

	async get(workflowId: string): Promise<V4WorkflowsWorkflowIdGet200Response> {
		return this.core.get(workflowId);
	}

	async getByName(
		name: string,
	): Promise<V4WorkflowsGet200ResponseWorkflowsInner | undefined> {
		return this.core.getByName(name);
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
}
