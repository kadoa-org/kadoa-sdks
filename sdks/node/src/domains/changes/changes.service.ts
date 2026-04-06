import type { KadoaClient } from "../../kadoa-client";
import { KadoaSdkException } from "../../runtime/exceptions";
import {
  ERROR_MESSAGES,
  KadoaErrorCode,
} from "../../runtime/exceptions/base.exception";
import { logger } from "../../runtime/logger";
import type { Change, ListChangesOptions, ListChangesResult } from "./changes.acl";
import { mapChange, mapListChangesResponse } from "./changes.acl";

const debug = logger.changes;

/**
 * Service for querying workflow change diffs.
 * Wraps the `/v4/changes` endpoints to provide structured change data
 * for real-time monitoring workflows.
 */
export class ChangesService {
  constructor(private readonly client: KadoaClient) {}

  private get workflowsApi() {
    return this.client.apis.workflows;
  }

  /**
   * List changes across one or more workflows.
   * Returns structured diffs (added, removed, changed records).
   */
  async list(options?: ListChangesOptions): Promise<ListChangesResult> {
    debug("list changes %o", options);
    const response = await this.workflowsApi.v4ChangesGet(options ?? {});
    return mapListChangesResponse(response.data);
  }

  /**
   * Get a single change by ID.
   */
  async get(changeId: string): Promise<Change> {
    debug("get change %s", changeId);
    const response = await this.workflowsApi.v4ChangesChangeIdGet({ changeId });
    const change = response.data;
    if (!change) {
      throw new KadoaSdkException(`Change not found: ${changeId}`, {
        code: KadoaErrorCode.NOT_FOUND,
        details: { changeId },
      });
    }
    return mapChange(change);
  }
}
