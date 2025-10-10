/**
 * Workflows domain ACL.
 * Wraps generated WorkflowsApi requests/responses and normalizes types.
 * Downstream code must import from this module instead of `generated/**`.
 */

import type {
  CreateWorkflowWithCustomSchemaBody,
  CreateWorkflowWithSchemaBody,
  MonitoringConfig,
  V4WorkflowsGet200ResponseWorkflowsInner,
  V4WorkflowsGet200ResponseWorkflowsInnerDisplayStateEnum,
  V4WorkflowsGet200ResponseWorkflowsInnerStateEnum,
  V4WorkflowsGetFormatEnum,
  V4WorkflowsGetIncludeDeletedEnum,
  V4WorkflowsGetMonitoringEnum,
  V4WorkflowsGetStateEnum,
  V4WorkflowsGetUpdateIntervalEnum,
  V4WorkflowsWorkflowIdGet200Response,
  V4WorkflowsWorkflowIdJobsJobIdGet200Response,
  V4WorkflowsWorkflowIdJobsJobIdGet200ResponseStateEnum,
  V4WorkflowsWorkflowIdRunPut200Response,
  V4WorkflowsWorkflowIdRunPutRequest,
  WorkflowsApiInterface,
  WorkflowsApiV4WorkflowsGetRequest,
} from "../../generated";

// ========================================
// API Client
// ========================================

export type { WorkflowsApiInterface };

// ========================================
// Enums
// ========================================

/**
 * Workflow state filter for list queries.
 */
export const WorkflowState = {
  Active: "ACTIVE",
  Error: "ERROR",
  Paused: "PAUSED",
  NotSupported: "NOT_SUPPORTED",
} as const satisfies Record<
  keyof typeof V4WorkflowsGetStateEnum,
  V4WorkflowsGetStateEnum
>;

export type WorkflowState = (typeof WorkflowState)[keyof typeof WorkflowState];

/**
 * Monitoring status filter.
 */
export const MonitoringStatus = {
  Enabled: "true",
  Disabled: "false",
} as const satisfies Record<string, V4WorkflowsGetMonitoringEnum>;

export type MonitoringStatus =
  (typeof MonitoringStatus)[keyof typeof MonitoringStatus];

/**
 * Update interval filter.
 */
export const UpdateInterval = {
  Hourly: "HOURLY",
  Daily: "DAILY",
  Weekly: "WEEKLY",
  Monthly: "MONTHLY",
} as const satisfies Record<
  keyof typeof V4WorkflowsGetUpdateIntervalEnum,
  V4WorkflowsGetUpdateIntervalEnum
>;

export type UpdateInterval =
  (typeof UpdateInterval)[keyof typeof UpdateInterval];

/**
 * Include deleted workflows filter.
 */
export const IncludeDeleted = {
  True: "true",
  False: "false",
} as const satisfies Record<string, V4WorkflowsGetIncludeDeletedEnum>;

export type IncludeDeleted =
  (typeof IncludeDeleted)[keyof typeof IncludeDeleted];

/**
 * Response format for workflow list.
 */
export const ResponseFormat = {
  Json: "json",
  Csv: "csv",
} as const satisfies Record<string, V4WorkflowsGetFormatEnum>;

export type ResponseFormat =
  (typeof ResponseFormat)[keyof typeof ResponseFormat];

/**
 * Workflow state enum.
 */
export const WorkflowStateEnum = {
  Active: "ACTIVE",
  Error: "ERROR",
  Paused: "PAUSED",
  NotSupported: "NOT_SUPPORTED",
  Preview: "PREVIEW",
  ComplianceReview: "COMPLIANCE_REVIEW",
  ComplianceRejected: "COMPLIANCE_REJECTED",
  Queued: "QUEUED",
  Setup: "SETUP",
  Deleted: "DELETED",
} as const satisfies Record<
  keyof typeof V4WorkflowsGet200ResponseWorkflowsInnerStateEnum,
  V4WorkflowsGet200ResponseWorkflowsInnerStateEnum
>;

export type WorkflowStateEnum =
  (typeof WorkflowStateEnum)[keyof typeof WorkflowStateEnum];

/**
 * Workflow display state enum.
 */
export const WorkflowDisplayStateEnum = {
  Active: "ACTIVE",
  Error: "ERROR",
  Paused: "PAUSED",
  NotSupported: "NOT_SUPPORTED",
  Preview: "PREVIEW",
  ComplianceReview: "COMPLIANCE_REVIEW",
  ComplianceRejected: "COMPLIANCE_REJECTED",
  Queued: "QUEUED",
  Setup: "SETUP",
  Running: "RUNNING",
} as const satisfies Record<
  keyof typeof V4WorkflowsGet200ResponseWorkflowsInnerDisplayStateEnum,
  V4WorkflowsGet200ResponseWorkflowsInnerDisplayStateEnum
>;

export type WorkflowDisplayStateEnum =
  (typeof WorkflowDisplayStateEnum)[keyof typeof WorkflowDisplayStateEnum];

/**
 * Job state enum.
 */
export const JobStateEnum = {
  InProgress: "IN_PROGRESS",
  Finished: "FINISHED",
  Failed: "FAILED",
  NotSupported: "NOT_SUPPORTED",
  FailedInsufficientFunds: "FAILED_INSUFFICIENT_FUNDS",
} as const satisfies Record<
  keyof typeof V4WorkflowsWorkflowIdJobsJobIdGet200ResponseStateEnum,
  V4WorkflowsWorkflowIdJobsJobIdGet200ResponseStateEnum
>;

export type JobStateEnum = (typeof JobStateEnum)[keyof typeof JobStateEnum];

// ========================================
// Request Types
// ========================================

export class ListWorkflowsRequest implements WorkflowsApiV4WorkflowsGetRequest {
  search?: string;
  skip?: number;
  limit?: number;
  state?: WorkflowState;
  tags?: Array<string>;
  monitoring?: MonitoringStatus;
  updateInterval?: UpdateInterval;
  templateId?: string;
  includeDeleted?: IncludeDeleted;
  format?: ResponseFormat;
}

export type CreateWorkflowRequest = CreateWorkflowWithSchemaBody;

export type CreateWorkflowWithCustomSchemaRequest =
  CreateWorkflowWithCustomSchemaBody;

// ========================================
// Response Types
// ========================================

/**
 * Workflow response with SDK-curated enum types.
 * Remaps generated enum fields to prevent type leakage.
 */
export interface WorkflowResponse
  extends Omit<
    V4WorkflowsGet200ResponseWorkflowsInner,
    "state" | "displayState"
  > {
  state?: WorkflowStateEnum;
  displayState?: WorkflowDisplayStateEnum;
}

/**
 * Get workflow details response with SDK-curated enum types.
 */
export interface GetWorkflowResponse
  extends Omit<V4WorkflowsWorkflowIdGet200Response, "state" | "displayState"> {
  state?: WorkflowStateEnum;
  displayState?: WorkflowDisplayStateEnum;
}

export type { MonitoringConfig };

/**
 * Get job response with SDK-curated enum types.
 */
export interface GetJobResponse
  extends Omit<V4WorkflowsWorkflowIdJobsJobIdGet200Response, "state"> {
  state?: JobStateEnum;
}

export type RunWorkflowRequest = V4WorkflowsWorkflowIdRunPutRequest;

export type RunWorkflowResponse = V4WorkflowsWorkflowIdRunPut200Response;
