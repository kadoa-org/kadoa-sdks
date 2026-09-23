import type { V5SupportIssuesPostRequest } from "../../generated";
import { KadoaHttpException } from "../../runtime/exceptions";

/**
 * A workflow-scoped support ticket request. The backend decides creator type (from the verified
 * token, never the body) and never pauses.
 */
export class CreateSupportIssueOptions implements V5SupportIssuesPostRequest {
  workflowId!: string;
  title!: string;
  description!: string;
  category?: string;
  subcategory?: string;
  jobId?: string;
}

export type CreateSupportIssueResult =
  | { status: "accepted"; supportRequestId: string }
  | {
      status: "existing";
      supportRequestId?: string;
      issueIdentifier?: string;
      message: string;
    }
  | { status: "skipped"; supportRequestId?: string; reason: string };

/**
 * `POST /v5/support/issues` documents no response schema (generated client types
 * the call as `AxiosPromise<void>`), so this is a narrow local shape for the body
 * we actually read, in place of trusting the generated `void` or casting to `never`.
 */
export interface CreateSupportIssueResponseData {
  success?: boolean;
  supportRequestId?: string;
  status?: string;
  skipped?: boolean;
  reason?: string;
}

/**
 * Only the documented fields reach the API, so a stray `pauseWorkflow` or `copilotSessionId`
 * can never be sent.
 */
export function toCreateSupportIssueRequest(
  options: CreateSupportIssueOptions,
) {
  const { workflowId, title, description, category, subcategory, jobId } =
    options;
  return {
    workflowId,
    title,
    description,
    ...(category !== undefined && { category }),
    ...(subcategory !== undefined && { subcategory }),
    ...(jobId !== undefined && { jobId }),
  };
}

export function mapCreateSupportIssueResponse(
  data: CreateSupportIssueResponseData,
): CreateSupportIssueResult {
  if (data.skipped) {
    return {
      status: "skipped",
      supportRequestId: data.supportRequestId,
      reason: data.reason ?? "skipped",
    };
  }
  return {
    status: "accepted",
    supportRequestId: data.supportRequestId as string,
  };
}

/**
 * The engine answers 409 when the workflow already has an open ticket. That is the dedup
 * working, so callers get a result naming the open ticket instead of an exception.
 */
export function mapExistingSupportIssue(
  error: unknown,
): CreateSupportIssueResult | undefined {
  if (!(error instanceof KadoaHttpException) || error.httpStatus !== 409)
    return undefined;
  const body = (error.responseBody ?? {}) as {
    error?: string;
    supportRequestId?: string;
    issueId?: string;
  };
  return {
    status: "existing",
    supportRequestId: body.supportRequestId,
    issueIdentifier: body.issueId,
    message: body.error ?? "Workflow already has an open support issue",
  };
}
