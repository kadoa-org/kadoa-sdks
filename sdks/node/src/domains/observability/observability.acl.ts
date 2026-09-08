/**
 * Observability domain ACL.
 * Wraps the generated WorkspacesApi observability request and hand-types its
 * response (the published spec documents no response schema yet).
 * Downstream code must import from this module instead of `generated/**`.
 */

import type { WorkspacesApiV5WorkspacesWorkspaceIdObservabilityGetRequest } from "../../generated";
import { KadoaSdkException } from "../../runtime/exceptions";
import { KadoaErrorCode } from "../../runtime/exceptions/base.exception";

// ========================================
// TYPES
// ========================================

export type WorkflowHealth = "healthy" | "degraded" | "down" | "idle";

export interface ObservabilityDailyPoint {
  /** UTC calendar day, YYYY-MM-DD */
  date: string;
  successfulRuns: number;
  failedRuns: number;
  /** Successful / total runs that day, in percent; null when the API has no value */
  uptimePercentage: number | null;
}

export interface WorkflowObservability {
  workflowId: string;
  workflowName: string;
  /** Derived from the last run state in the window: FINISHED healthy, FAILED down, otherwise idle */
  health: WorkflowHealth;
  successfulRuns: number;
  failedRuns: number;
  uptimePercentage: number | null;
  totalRecordsDelivered: number;
  avgRecordsPerRun: number;
  /** Mean minutes between a failed run and the next successful run; null when nothing failed and recovered */
  mttrMinutes: number | null;
  daily: ObservabilityDailyPoint[];
}

export interface ObservabilityPeriodSnapshot {
  uptimePercentage: number;
  totalRecordsDelivered: number;
  mttrMinutes: number | null;
}

export interface ObservabilitySupportRequest {
  workflowId: string | null;
  workflowName: string | null;
  requestedAt: string;
  resolvedAt: string | null;
  resolutionHours: number | null;
  linearIssue: string | null;
  creatorType: "assistant" | "system" | "user" | null;
  requestedBy: string | null;
}

export interface ObservabilityWorkflowLifecycle {
  workflowId: string;
  workflowName: string;
  createdAt: string;
  buildingHours: number | null;
  reviewHours: number | null;
  runtimeHours: number | null;
}

export interface ObservabilityOverview {
  overallUptimePercentage: number;
  successfulRuns: number;
  failedRuns: number;
  mttrMinutes: number | null;
  totalRecordsDelivered: number;
  avgRecordsPerRun: number;
  avgCustomerReviewHours: number | null;
  healthyWorkflows: number;
  degradedWorkflows: number;
  downWorkflows: number;
  idleWorkflows: number;
  openIncidents: number;
  /** Same-length window before windowStart; null when it has no data */
  previous: ObservabilityPeriodSnapshot | null;
  /** Sorted by the API: lowest uptime first */
  workflows: WorkflowObservability[];
  daily: ObservabilityDailyPoint[];
  supportRequests: ObservabilitySupportRequest[];
  workflowLifecycles: ObservabilityWorkflowLifecycle[];
  windowStart: string;
  windowEnd: string;
}

// ========================================
// REQUEST OPTIONS
// ========================================

export const OBSERVABILITY_MAX_DAYS = 365;

/** Options for the workspace observability overview. */
export class GetObservabilityOptions {
  /** Window length in days, 1 to 365; the API defaults to 30 */
  days?: number;
}

export function toObservabilityRequest(
  workspaceId: string,
  options?: GetObservabilityOptions,
): Omit<
  WorkspacesApiV5WorkspacesWorkspaceIdObservabilityGetRequest,
  "xApiKey" | "authorization"
> {
  const days = options?.days;
  if (
    days !== undefined &&
    !(Number.isInteger(days) && days >= 1 && days <= OBSERVABILITY_MAX_DAYS)
  ) {
    throw new KadoaSdkException(
      `days must be an integer between 1 and ${OBSERVABILITY_MAX_DAYS}`,
      {
        code: KadoaErrorCode.VALIDATION_ERROR,
        details: { days },
      },
    );
  }
  return { workspaceId, days: days === undefined ? undefined : String(days) };
}

// ========================================
// MAPPER (wire -> domain)
// ========================================

const HEADLINE_NUMBER_FIELDS = [
  "overallUptimePercentage",
  "successfulRuns",
  "failedRuns",
  "totalRecordsDelivered",
  "avgRecordsPerRun",
  "healthyWorkflows",
  "degradedWorkflows",
  "downWorkflows",
  "idleWorkflows",
  "openIncidents",
] as const;

function invalidBody(reason: string): KadoaSdkException {
  return new KadoaSdkException(`Observability response is invalid: ${reason}`, {
    code: KadoaErrorCode.VALIDATION_ERROR,
  });
}

/**
 * The generated client types this response as `void` because the spec has no
 * schema. Validate the headline shape here so a proxy error page or a changed
 * backend payload fails loudly instead of becoming NaN in a customer answer.
 */
export function mapObservabilityOverview(raw: unknown): ObservabilityOverview {
  if (typeof raw !== "object" || raw === null) {
    throw invalidBody("body is not an object");
  }
  const body = raw as Record<string, unknown>;
  for (const field of HEADLINE_NUMBER_FIELDS) {
    if (typeof body[field] !== "number") {
      throw invalidBody(`missing numeric field ${field}`);
    }
  }
  if (!Array.isArray(body.workflows) || !Array.isArray(body.daily)) {
    throw invalidBody("workflows and daily must be arrays");
  }
  if (
    typeof body.windowStart !== "string" ||
    typeof body.windowEnd !== "string"
  ) {
    throw invalidBody("windowStart and windowEnd must be strings");
  }

  const previous = body.previous as
    | ObservabilityPeriodSnapshot
    | null
    | undefined;

  return {
    overallUptimePercentage: body.overallUptimePercentage as number,
    successfulRuns: body.successfulRuns as number,
    failedRuns: body.failedRuns as number,
    mttrMinutes: (body.mttrMinutes as number | null | undefined) ?? null,
    totalRecordsDelivered: body.totalRecordsDelivered as number,
    avgRecordsPerRun: body.avgRecordsPerRun as number,
    avgCustomerReviewHours:
      (body.avgCustomerReviewHours as number | null | undefined) ?? null,
    healthyWorkflows: body.healthyWorkflows as number,
    degradedWorkflows: body.degradedWorkflows as number,
    downWorkflows: body.downWorkflows as number,
    idleWorkflows: body.idleWorkflows as number,
    openIncidents: body.openIncidents as number,
    previous: previous ?? null,
    workflows: (body.workflows as WorkflowObservability[]).map(mapWorkflow),
    daily: (body.daily as ObservabilityDailyPoint[]).map(mapDailyPoint),
    supportRequests: Array.isArray(body.supportRequests)
      ? (body.supportRequests as ObservabilitySupportRequest[])
      : [],
    workflowLifecycles: Array.isArray(body.workflowLifecycles)
      ? (body.workflowLifecycles as ObservabilityWorkflowLifecycle[])
      : [],
    windowStart: body.windowStart,
    windowEnd: body.windowEnd,
  };
}

function mapDailyPoint(raw: ObservabilityDailyPoint): ObservabilityDailyPoint {
  return {
    date: raw.date,
    successfulRuns: raw.successfulRuns,
    failedRuns: raw.failedRuns,
    uptimePercentage: raw.uptimePercentage ?? null,
  };
}

function mapWorkflow(raw: WorkflowObservability): WorkflowObservability {
  return {
    workflowId: raw.workflowId,
    workflowName: raw.workflowName,
    health: raw.health,
    successfulRuns: raw.successfulRuns,
    failedRuns: raw.failedRuns,
    uptimePercentage: raw.uptimePercentage ?? null,
    totalRecordsDelivered: raw.totalRecordsDelivered,
    avgRecordsPerRun: raw.avgRecordsPerRun,
    mttrMinutes: raw.mttrMinutes ?? null,
    daily: (raw.daily ?? []).map(mapDailyPoint),
  };
}
