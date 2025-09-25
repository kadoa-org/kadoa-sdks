import type {
	V4WorkflowsGet200ResponseWorkflowsInnerDisplayStateEnum,
	V4WorkflowsGet200ResponseWorkflowsInnerStateEnum,
	V4WorkflowsWorkflowIdGet200Response,
	WorkflowWithCustomSchemaLocation,
} from "../../../generated";
import type { SchemaField } from "../extraction/services/entity-resolver.service";
import type {
	MonitoringConfig,
	NavigationMode,
	WorkflowInterval,
} from "../extraction/extraction.types";
import type { PollingOptions } from "../../runtime/utils";

export type LocationConfig = WorkflowWithCustomSchemaLocation;
export type WorkflowId = string;

export type WorkflowStateEnum =
	V4WorkflowsGet200ResponseWorkflowsInnerStateEnum;
export type WorkflowState = WorkflowStateEnum[keyof WorkflowStateEnum];

export type WorkflowDisplayStateEnum =
	V4WorkflowsGet200ResponseWorkflowsInnerDisplayStateEnum;
export type WorkflowDisplayState =
	WorkflowDisplayStateEnum[keyof WorkflowDisplayStateEnum];

export interface WaitOptions extends PollingOptions {
	targetState?: WorkflowState;
}

export interface WorkflowsCoreServiceInterface {
	create(input: CreateWorkflowInput): Promise<{ id: WorkflowId }>;
	get(id: WorkflowId): Promise<V4WorkflowsWorkflowIdGet200Response>;
	cancel(id: WorkflowId): Promise<void>;
	resume(id: WorkflowId): Promise<void>;
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
	fields?: Array<SchemaField>;
	tags?: string[];
	interval?: WorkflowInterval;
	monitoring?: MonitoringConfig;
	location?: LocationConfig;
	bypassPreview?: boolean;
}
