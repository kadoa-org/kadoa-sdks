import type { KadoaClient } from "../../kadoa-client";
import { logger } from "../../runtime/logger";
import {
  type CreateSupportIssueOptions,
  type CreateSupportIssueResponseData,
  type CreateSupportIssueResult,
  mapCreateSupportIssueResponse,
  mapExistingSupportIssue,
  toCreateSupportIssueRequest,
} from "./support.acl";

const debug = logger.support;

/**
 * Workflow support tickets. Wraps `POST /v5/support/issues`. Team, requester and creator type
 * come from the caller's credentials and the backend; duplicates are resolved by the engine.
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
      const response = await this.supportApi.v5SupportIssuesPost({
        v5SupportIssuesPostRequest: toCreateSupportIssueRequest(options),
      });
      // The generated client types this response `void` (the endpoint documents no response
      // schema); this is the actual body shape the backend sends, so we go through `unknown`
      // to name it precisely instead of casting to `never`.
      return mapCreateSupportIssueResponse(
        response.data as unknown as CreateSupportIssueResponseData,
      );
    } catch (error) {
      const existing = mapExistingSupportIssue(error);
      if (existing) return existing;
      throw error;
    }
  }
}
