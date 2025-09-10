import type { V4WorkflowsWorkflowIdGet200Response } from "../../../generated";
import type { WorkflowWithCustomSchemaFieldsInner } from "../../../generated/models/workflow-with-custom-schema-fields-inner";

export type WorkflowId = string;

export interface WaitOptions {
	pollIntervalMs?: number;
	timeoutMs?: number;
	abortSignal?: AbortSignal;
}

export interface WorkflowsCoreServiceInterface {
	create(
		input: CreateWorkflowInput,
		idempotencyKey?: string,
	): Promise<{ id: WorkflowId }>;
	get(id: WorkflowId): Promise<V4WorkflowsWorkflowIdGet200Response>;
	cancel(id: WorkflowId): Promise<void>;
	wait(
		id: WorkflowId,
		options?: WaitOptions,
	): Promise<V4WorkflowsWorkflowIdGet200Response>;
}

export interface CreateWorkflowInput {
	urls: string[];
	navigationMode: string;
	name: string;
	entity?: string;
	fields?: Array<WorkflowWithCustomSchemaFieldsInner>;
	tags?: string[];
}
