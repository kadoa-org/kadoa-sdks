import type { KadoaClient } from "../../client/kadoa-client";
import { KadoaSdkException } from "../../runtime/exceptions";
import { KadoaErrorCode } from "../../runtime/exceptions/base.exception";
import { logger } from "../../runtime/logger";
import {
  type ActiveSeriesPoint,
  type ActivityUsage,
  type BillableWorkflows,
  mapActiveSeries,
  mapActivityUsage,
  mapBillableWorkflows,
  mapPeriodSeries,
  mapQuotas,
  mapWorkspaceDetails,
  type PeriodSeriesPoint,
  type UsageSeriesOptions,
  type WorkspaceDetails,
  type WorkspaceQuotas,
  type WorkspaceType,
} from "./usage.acl";

const debug = logger.usage;

export type UsageScope = "team" | "organization";

export interface ResolvedUsageWorkspace {
  workspaceId: string;
  workspaceType: WorkspaceType;
  name: string;
  teamId: string;
  orgId: string | null;
}

/**
 * Workspace usage: quotas, billing period, billable workflows, and daily history.
 * Wraps `/v5/workspaces/{workspaceId}/*`. A workspace id is a team id or an
 * organization id; the Public API authorizes the caller's active team.
 */
export class UsageService {
  constructor(private readonly client: KadoaClient) {}

  private get api() {
    return this.client.apis.workspaces;
  }

  async getWorkspaceDetails(workspaceId: string): Promise<WorkspaceDetails> {
    debug("get workspace details %s", workspaceId);
    const response = await this.api.v5WorkspacesWorkspaceIdDetailsGet({
      workspaceId,
    });
    return mapWorkspaceDetails(response.data);
  }

  async getQuotas(workspaceId: string): Promise<WorkspaceQuotas> {
    debug("get quotas %s", workspaceId);
    const response = await this.api.v5WorkspacesWorkspaceIdQuotasGet({
      workspaceId,
    });
    return mapQuotas(response.data);
  }

  async listBillableWorkflows(workspaceId: string): Promise<BillableWorkflows> {
    debug("list billable workflows %s", workspaceId);
    const response = await this.api.v5WorkspacesWorkspaceIdBillableWorkflowsGet(
      {
        workspaceId,
      },
    );
    return mapBillableWorkflows(response.data);
  }

  async getActiveSeries(
    workspaceId: string,
    options?: UsageSeriesOptions,
  ): Promise<ActiveSeriesPoint[]> {
    debug("get active series %s %o", workspaceId, options);
    const response = await this.api.v5WorkspacesWorkspaceIdMonthlyActiveGet({
      workspaceId,
      days: options?.days,
    });
    return mapActiveSeries(response.data);
  }

  async getPeriodSeries(
    workspaceId: string,
    options?: UsageSeriesOptions,
  ): Promise<PeriodSeriesPoint[]> {
    debug("get period series %s %o", workspaceId, options);
    const response = await this.api.v5WorkspacesWorkspaceIdPeriodSeriesGet({
      workspaceId,
      days: options?.days,
    });
    return mapPeriodSeries(response.data);
  }

  async getActivityUsage(
    workspaceId: string,
    options?: UsageSeriesOptions,
  ): Promise<ActivityUsage> {
    debug("get activity usage %s %o", workspaceId, options);
    const response = await this.api.v5WorkspacesWorkspaceIdActivityUsageGet({
      workspaceId,
      days: options?.days,
    });
    return mapActivityUsage(response.data);
  }

  /**
   * Turn the caller's team into the workspace the usage endpoints should read.
   * `organization` widens to the team's owning org; the org id always comes
   * from the team's own details, never from caller input.
   */
  async resolveWorkspace(
    teamId: string,
    scope: UsageScope,
  ): Promise<ResolvedUsageWorkspace> {
    const team = await this.getWorkspaceDetails(teamId);
    if (scope === "team") {
      return {
        workspaceId: team.id,
        workspaceType: "team",
        name: team.name,
        teamId,
        orgId: team.orgId,
      };
    }
    if (!team.orgId) {
      throw new KadoaSdkException(
        "This team does not belong to an organization; use scope 'team'",
        {
          code: KadoaErrorCode.VALIDATION_ERROR,
          details: { teamId },
        },
      );
    }
    const org = await this.getWorkspaceDetails(team.orgId);
    return {
      workspaceId: org.id,
      workspaceType: "organization",
      name: org.name,
      teamId,
      orgId: team.orgId,
    };
  }
}
