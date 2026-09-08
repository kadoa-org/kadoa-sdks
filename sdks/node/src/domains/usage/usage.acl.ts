/**
 * Usage domain ACL.
 * Wraps the generated WorkspacesApi usage endpoints behind SDK-owned names.
 * Downstream code must import from this module instead of `generated/**`.
 */

import type {
  V5WorkspacesWorkspaceIdActivityUsageGet200Response,
  V5WorkspacesWorkspaceIdBillableWorkflowsGet200Response,
  V5WorkspacesWorkspaceIdBillableWorkflowsGet200ResponseActiveWorkflowsInner,
  V5WorkspacesWorkspaceIdBillableWorkflowsGet200ResponseWorkflowsInner,
  V5WorkspacesWorkspaceIdDetailsGet200Response,
  V5WorkspacesWorkspaceIdMonthlyActiveGet200Response,
  V5WorkspacesWorkspaceIdPeriodSeriesGet200Response,
  V5WorkspacesWorkspaceIdQuotasGet200Response,
} from "../../generated";

// ========================================
// PUBLIC TYPES
// ========================================

export type WorkspaceType = "team" | "organization";

export const UsageBillingModel = {
  EnterpriseActive: "enterprise_active",
  EnterpriseApproved: "enterprise_approved",
} as const;
export type UsageBillingModel =
  (typeof UsageBillingModel)[keyof typeof UsageBillingModel];

export interface WorkspaceDetails {
  id: string;
  type: WorkspaceType | "user";
  name: string;
  /** Owning organization of a team workspace; null for standalone teams and for org workspaces. */
  orgId: string | null;
  memberCount: number | null;
}

export interface BillingPeriod {
  /** ISO date-time, inclusive. */
  start: string;
  /** ISO date-time, exclusive. */
  end: string;
  /** Contract renewal date, YYYY-MM-DD, or null when not set. */
  renewalDate: string | null;
}

export interface WorkspaceQuotas {
  workspaceId: string;
  workspaceType: WorkspaceType;
  /** Org-level billing model; null for a standalone team. */
  billingModel: UsageBillingModel | null;
  limits: {
    /** Contracted workflow slots (0 when no quota row exists). */
    workflowSlots: number;
    /** Contracted extracted rows (0 when no quota row exists). */
    extractedRows: number;
  };
  used: {
    /** Non-deleted workflows in the commercial scope. */
    totalWorkflows: number;
    /** Active billing model: ACTIVE workflows with an enabled schedule plus ACTIVE realtime monitors. */
    activeWorkflows: number;
    /** Weighted slots for activeWorkflows. */
    activeWorkflowSlots: number;
    /** Distinct workflows that ran successfully in the trailing 35 days or are live monitors. */
    active35Workflows: number;
    /** Approved billing model: distinct workflows that ran successfully inside the current billing period. Null without a billing period. */
    contractActiveWorkflows: number | null;
    /** Weighted slots for contractActiveWorkflows. */
    contractActiveWorkflowSlots: number | null;
    /** contractActiveWorkflows for the previous billing period. */
    previousContractActiveWorkflows: number | null;
    previousContractActiveWorkflowSlots: number | null;
    /** Rows extracted by successful non-preview runs inside the current billing period. Null without a billing period. */
    extractedRowsThisPeriod: number | null;
    /** All-time cumulative extracted rows (ledger snapshot). */
    extractedRowsAllTime: number;
  };
  billingPeriod: BillingPeriod | null;
  previousBillingPeriod: Omit<BillingPeriod, "renewalDate"> | null;
}

export interface UsageWorkflow {
  workflowId: string;
  name: string | null;
  /** Current workflow state, DELETED included for billable rows. */
  state: string;
  /** ACTIVE and on an enabled schedule or a live realtime monitor. */
  scheduled: boolean;
  firstRunAt: string | null;
  /** Slot weight assigned by Kadoa: 0.1 simple, 1 standard, 2-10 complex. */
  slotWeight: number;
  runsInPeriod: number;
  rowsExtracted: number;
}

export interface BillableWorkflows {
  billingPeriod: Omit<BillingPeriod, "renewalDate"> | null;
  /** Workflows with at least one successful non-preview run in the billing period. */
  billableWorkflows: UsageWorkflow[];
  billableSlotUsage: number;
  /** Workflows counted by the Active billing rule right now. */
  activeWorkflows: UsageWorkflow[];
  activeSlotUsage: number;
  /** ACTIVE workflows that will keep running into the next period. */
  scheduledWorkflows: number;
}

export interface ActiveSeriesPoint {
  /** UTC day, YYYY-MM-DD. */
  date: string;
  active: number;
  activeSlots: number;
  active35: number;
}

export interface PeriodSeriesPoint {
  date: string;
  /** Approved workflows accumulated since that day's billing-period start. */
  approved: number;
  approvedSlots: number;
  /** Extracted rows accumulated since that day's billing-period start. */
  rows: number;
}

export interface ActivityUsagePoint {
  date: string;
  totalWorkflows: number;
  approvedWorkflows: number;
  extractedRows: number;
}

export interface ActivityUsage {
  start: string;
  end: string;
  totals: { approvedWorkflows: number; extractedRows: number };
  days: ActivityUsagePoint[];
}

export interface UsageSeriesOptions {
  /** Trailing UTC days to return. Clamped by the API (1-400 for active and period series, 1-366 for activity). */
  days?: number;
}

// ========================================
// MAPPERS (generated -> domain)
// ========================================

// `orgId` is on the wire for team workspaces but missing from the spec
// (kadoa-backend details.ts Swagger). Read it through a local type until the
// spec refresh removes the need.
type RawDetailsWorkspace = NonNullable<
  V5WorkspacesWorkspaceIdDetailsGet200Response["workspace"]
> & {
  orgId?: string | null;
};

export function mapWorkspaceDetails(
  raw: V5WorkspacesWorkspaceIdDetailsGet200Response,
): WorkspaceDetails {
  const workspace = raw.workspace as RawDetailsWorkspace | undefined;
  if (!workspace?.id || !workspace.type) {
    throw new Error("Workspace details response has no workspace");
  }
  return {
    id: workspace.id,
    type: workspace.type as WorkspaceDetails["type"],
    name: workspace.name ?? "",
    orgId: workspace.orgId ?? null,
    memberCount:
      typeof workspace.memberCount === "number" ? workspace.memberCount : null,
  };
}

export function mapQuotas(
  raw: V5WorkspacesWorkspaceIdQuotasGet200Response,
): WorkspaceQuotas {
  const workspace = raw.workspace;
  if (!workspace?.id || !workspace.type) {
    throw new Error("Workspace quotas response has no workspace");
  }
  const available = workspace.availableQuotas ?? {};
  const used = workspace.usedQuotas ?? {};
  const period = workspace.billingPeriod ?? null;
  const previous = workspace.previousBillingPeriod ?? null;
  return {
    workspaceId: workspace.id,
    workspaceType: workspace.type as WorkspaceType,
    billingModel:
      (workspace.billingType as UsageBillingModel | null | undefined) ?? null,
    limits: {
      workflowSlots: available.activeWorkflows ?? 0,
      extractedRows: available.maxExtractedRows ?? 0,
    },
    used: {
      totalWorkflows: used.currentTotalWorkflows ?? 0,
      activeWorkflows: used.currentBillingActiveWorkflows ?? 0,
      activeWorkflowSlots: used.currentBillingActiveSlots ?? 0,
      active35Workflows: used.currentActive35Workflows ?? 0,
      contractActiveWorkflows: used.currentContractActiveWorkflows ?? null,
      contractActiveWorkflowSlots: used.currentContractActiveSlots ?? null,
      previousContractActiveWorkflows:
        used.previousContractActiveWorkflows ?? null,
      previousContractActiveWorkflowSlots:
        used.previousContractActiveSlots ?? null,
      extractedRowsThisPeriod: used.currentPeriodExtractedRows ?? null,
      extractedRowsAllTime: used.currentExtractedRows ?? 0,
    },
    billingPeriod:
      period?.start && period.end
        ? {
            start: period.start,
            end: period.end,
            renewalDate: period.renewalDate ?? null,
          }
        : null,
    previousBillingPeriod:
      previous?.start && previous.end
        ? { start: previous.start, end: previous.end }
        : null,
  };
}

function mapUsageWorkflow(
  raw:
    | V5WorkspacesWorkspaceIdBillableWorkflowsGet200ResponseWorkflowsInner
    | V5WorkspacesWorkspaceIdBillableWorkflowsGet200ResponseActiveWorkflowsInner,
): UsageWorkflow {
  return {
    workflowId: raw.workflowId ?? "",
    name: raw.name ?? null,
    state: raw.state ?? "",
    scheduled: raw.scheduled ?? false,
    firstRunAt: raw.firstRunAt ?? null,
    slotWeight: raw.billingMultiplier ?? 0,
    runsInPeriod: raw.runsInPeriod ?? 0,
    rowsExtracted: raw.totalRows ?? 0,
  };
}

export function mapBillableWorkflows(
  raw: V5WorkspacesWorkspaceIdBillableWorkflowsGet200Response,
): BillableWorkflows {
  const period = raw.billingPeriod ?? null;
  return {
    billingPeriod:
      period?.start && period.end
        ? { start: period.start, end: period.end }
        : null,
    billableWorkflows: (raw.workflows ?? []).map(mapUsageWorkflow),
    billableSlotUsage: raw.slotUsage ?? 0,
    activeWorkflows: (raw.activeWorkflows ?? []).map(mapUsageWorkflow),
    activeSlotUsage: raw.activeSlotUsage ?? 0,
    scheduledWorkflows: raw.scheduledWorkflows ?? 0,
  };
}

export function mapActiveSeries(
  raw: V5WorkspacesWorkspaceIdMonthlyActiveGet200Response,
): ActiveSeriesPoint[] {
  return (raw.days ?? []).map((d) => ({
    date: d.date ?? "",
    active: d.active ?? 0,
    activeSlots: d.activeSlots ?? 0,
    active35: d.active35 ?? 0,
  }));
}

export function mapPeriodSeries(
  raw: V5WorkspacesWorkspaceIdPeriodSeriesGet200Response,
): PeriodSeriesPoint[] {
  return (raw.days ?? []).map((d) => ({
    date: d.date ?? "",
    approved: d.approved ?? 0,
    approvedSlots: d.approvedSlots ?? 0,
    rows: d.rows ?? 0,
  }));
}

export function mapActivityUsage(
  raw: V5WorkspacesWorkspaceIdActivityUsageGet200Response,
): ActivityUsage {
  return {
    start: raw.start,
    end: raw.end,
    totals: {
      approvedWorkflows: raw.totals?.approvedWorkflows ?? 0,
      extractedRows: raw.totals?.extractedRows ?? 0,
    },
    days: (raw.days ?? []).map((d) => ({
      date: d.date,
      totalWorkflows: d.totalWorkflows,
      approvedWorkflows: d.approvedWorkflows,
      extractedRows: d.extractedRows,
    })),
  };
}
