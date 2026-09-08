import type { KadoaClient } from "../../kadoa-client";
import { logger } from "../../runtime/logger";
import type { ListActivityOptions, ListActivityResult } from "./activity.acl";
import { mapListActivityResponse } from "./activity.acl";

const debug = logger.activity;

/**
 * Team Activity log (audit trail) service.
 * Wraps `GET /v4/activity`. Team scoping and authorization are enforced by the
 * Public API from the caller's credentials; this service never sends a team id.
 */
export class ActivityService {
  constructor(private readonly client: KadoaClient) {}

  private get activityApi() {
    return this.client.apis.activity;
  }

  /** List activity events for the caller's active team, newest first. */
  async list(options?: ListActivityOptions): Promise<ListActivityResult> {
    debug("list activity %o", options);
    const response = await this.activityApi.v4ActivityGet(options ?? {});
    return mapListActivityResponse(response.data);
  }
}
