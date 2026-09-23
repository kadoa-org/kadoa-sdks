import type { KadoaClient } from "../../kadoa-client";
import { logger } from "../../runtime/logger";
import {
  type CreateSupportIssueOptions,
  type CreateSupportIssueResult,
  mapCreateSupportIssueResponse,
  mapExistingSupportIssue,
  toCreateSupportIssueRequest,
} from "./support.acl";

const debug = logger.support;

/**
 * Workflow support tickets. Wraps `POST /v4/support/issues`, the single public entry point for
 * ticket creation. Team and requester come from the caller's credentials, creator type from the
 * backend; duplicates are resolved by the engine.
 */
export class SupportService {
  constructor(private readonly client: KadoaClient) {}

  private get supportApi() {
    return this.client.apis.support;
  }

  async createIssue(
    options: CreateSupportIssueOptions,
  ): Promise<CreateSupportIssueResult> {
    debug("create support issue for workflow %s", options.workflowId);
    try {
      const response = await this.supportApi.v4SupportIssuesPost({
        v4SupportIssuesPostRequest: toCreateSupportIssueRequest(options),
      });
      return mapCreateSupportIssueResponse(response.data);
    } catch (error) {
      const existing = mapExistingSupportIssue(error);
      if (existing) return existing;
      throw error;
    }
  }
}
