import type {
	V4WorkflowsWorkflowIdGet200Response,
	WorkflowWithCustomSchemaLocation,
} from "../../../generated";
import type { WorkflowWithCustomSchemaFieldsInner } from "../../../generated/models/workflow-with-custom-schema-fields-inner";
import type {
	MonitoringConfig,
	NavigationMode,
	WorkflowInterval,
} from "../extraction/extraction.types";

export type LocationConfig = WorkflowWithCustomSchemaLocation;
export type WorkflowId = string;

export interface WaitOptions {
	pollIntervalMs?: number;
	timeoutMs?: number;
	abortSignal?: AbortSignal;
}

export interface WorkflowsCoreServiceInterface {
	create(input: CreateWorkflowInput): Promise<{ id: WorkflowId }>;
	get(id: WorkflowId): Promise<V4WorkflowsWorkflowIdGet200Response>;
	cancel(id: WorkflowId): Promise<void>;
	wait(
		id: WorkflowId,
		options?: WaitOptions,
	): Promise<V4WorkflowsWorkflowIdGet200Response>;
}

export interface CreateWorkflowInput {
	urls: string[];
	navigationMode: NavigationMode;
	name: string;
	entity?: string;
	fields?: Array<WorkflowWithCustomSchemaFieldsInner>;
	tags?: string[];
	interval?: WorkflowInterval;
	monitoring?: MonitoringConfig;
	location?: LocationConfig;
}
