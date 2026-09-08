import type { KadoaClient } from "../../client/kadoa-client";
import { logger } from "../../runtime/logger";
import {
  type GetObservabilityOptions,
  mapObservabilityOverview,
  type ObservabilityOverview,
  toObservabilityRequest,
} from "./observability.acl";

const debug = logger.observability;

/**
 * The observability aggregation runs several cold-store queries with a 60 second
 * budget each; the dashboard waits 90 seconds for it. The client default of
 * 30 seconds would time out on teams with many scheduled workflows.
 */
export const OBSERVABILITY_REQUEST_TIMEOUT_MS = 90_000;

/**
 * Workspace observability: per-workflow health, uptime, MTTR, records delivered,
 * and daily series. Wraps `GET /v5/workspaces/{workspaceId}/observability`.
 * The Public API authorizes the caller's active team for the workspace.
 */
export class ObservabilityService {
  constructor(private readonly client: KadoaClient) {}

  private get api() {
    return this.client.apis.workspaces;
  }

  async getOverview(
    workspaceId: string,
    options?: GetObservabilityOptions,
  ): Promise<ObservabilityOverview> {
    debug("get observability overview %s %o", workspaceId, options);
    const response = await this.api.v5WorkspacesWorkspaceIdObservabilityGet(
      toObservabilityRequest(workspaceId, options),
      { timeout: OBSERVABILITY_REQUEST_TIMEOUT_MS },
    );
    return mapObservabilityOverview(response.data);
  }
}
