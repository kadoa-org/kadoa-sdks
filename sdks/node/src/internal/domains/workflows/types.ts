import type {
	V4WorkflowsGet200ResponseWorkflowsInnerDisplayStateEnum,
	V4WorkflowsGet200ResponseWorkflowsInnerStateEnum,
	V4WorkflowsWorkflowIdJobsJobIdGet200Response,
	V4WorkflowsWorkflowIdJobsJobIdGet200ResponseStateEnum,
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
export interface CreateWorkflowInput {
	urls: string[];
	navigationMode: NavigationMode;
	name: string;
	description?: string;
	schemaId?: string;
	entity?: string;
	fields?: Array<SchemaField>;
	tags?: string[];
	interval?: WorkflowInterval;
	monitoring?: MonitoringConfig;
	location?: LocationConfig;
	bypassPreview?: boolean;
	autoStart?: boolean;
	schedules?: string[];
}

// Job and Workflow Run Types
export type JobId = string;
export type JobStatus =
	(typeof V4WorkflowsWorkflowIdJobsJobIdGet200ResponseStateEnum)[keyof typeof V4WorkflowsWorkflowIdJobsJobIdGet200ResponseStateEnum];

export interface RunWorkflowInput {
	variables?: Record<string, unknown>;
	limit?: number;
}

export interface StartedJob {
	jobId: JobId;
	message?: string;
	status?: string;
}

export interface FinishedJob
	extends V4WorkflowsWorkflowIdJobsJobIdGet200Response {}

export interface JobWaitOptions extends PollingOptions {
	targetStatus?: JobStatus;
}

// Terminal job states for polling
export const TERMINAL_JOB_STATES: Set<JobStatus> = new Set([
	"FINISHED",
	"FAILED",
	"NOT_SUPPORTED",
	"FAILED_INSUFFICIENT_FUNDS",
]);
