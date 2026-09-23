import type {
  V4SupportIssuesPost202Response,
  V4SupportIssuesPostRequest,
  V4SupportIssuesPostRequestCategoryEnum,
  V4SupportIssuesPostRequestSubcategoryEnum,
} from "../../generated";
import { KadoaHttpException } from "../../runtime/exceptions";

/**
 * A workflow-scoped support ticket. Filed through `POST /v4/support/issues`, the single public
 * entry point for ticket creation, so every rule that route owns applies. The backend decides
 * creator type from `copilotSessionId` (validated against the caller's team) and this SDK never
 * sends `pauseWorkflow`.
 */
export class CreateSupportIssueOptions {
  /** Required: the engine's duplicate protection keys on the workflow. */
  workflowId!: string;
  title!: string;
  description!: string;
  /** Defaults to `workflow_issue`. */
  category?: V4SupportIssuesPostRequestCategoryEnum;
  subcategory?: V4SupportIssuesPostRequestSubcategoryEnum;
  /** The workflow run the issue is about. */
  jobId?: string;
  /** Kadoa Assistant session the ticket was raised from; links it and marks it assistant-created. */
  copilotSessionId?: string;
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
 * Only the documented ticket fields reach the API, so a stray `pauseWorkflow` can never be sent.
 */
export function toCreateSupportIssueRequest(
  options: CreateSupportIssueOptions,
): V4SupportIssuesPostRequest {
  const {
    workflowId,
    title,
    description,
    category,
    subcategory,
    jobId,
    copilotSessionId,
  } = options;
  return {
    workflowId,
    title,
    description,
    category: category ?? "workflow_issue",
    ...(subcategory !== undefined && { subcategory }),
    ...(jobId !== undefined && { jobId }),
    ...(copilotSessionId !== undefined && { copilotSessionId }),
  };
}

export function mapCreateSupportIssueResponse(
  data: V4SupportIssuesPost202Response,
): CreateSupportIssueResult {
  if (data.skipped) {
    return {
      status: "skipped",
      supportRequestId: data.supportRequestId,
      reason: data.reason ?? data.code ?? "skipped",
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
