/**
 * Templates domain ACL.
 * Wraps generated TemplatesApi requests/responses and normalizes types.
 * Downstream code must import from this module instead of `generated/**`.
 */

import {
  // Request types
  type ApplyTemplateUpdateBody as GeneratedApplyVersionRequest,
  // Response types
  type ApplyTemplateUpdateResponse as GeneratedApplyVersionResult,
  type CreateTemplateBody as GeneratedCreateTemplateBody,
  type CreateTemplateVersionBody as GeneratedCreateTemplateVersionBody,
  type LinkWorkflowsBody as GeneratedLinkWorkflowsBody,
  type LinkWorkflowsConflictResponseConflictsInner as GeneratedLinkWorkflowsConflict,
  type LinkWorkflowsResponse as GeneratedLinkWorkflowsResult,
  type SaveFromWorkflowBody as GeneratedSaveFromWorkflowBody,
  type SaveFromWorkflowResponseData as GeneratedSaveFromWorkflowResult,
  type TemplateCreatedResponseData as GeneratedTemplate,
  type TemplateDetailResponseBodyData as GeneratedTemplateDetail,
  type TemplateWorkflowsResponseDataInner as GeneratedTemplateLinkedWorkflow,
  type TemplateResponse as GeneratedTemplateListItem,
  type TemplateSchemasResponseDataInner as GeneratedTemplateSchema,
  type TemplateVersionCreatedResponseData as GeneratedTemplateVersion,
  type UnlinkWorkflowsBody as GeneratedUnlinkWorkflowsBody,
  type UnlinkWorkflowsResponse as GeneratedUnlinkWorkflowsResult,
  type UpdateTemplateBody as GeneratedUpdateTemplateBody,
  // API Client
  TemplatesApi,
} from "../../generated";

// ========================================
// API Client
// ========================================

export { TemplatesApi };

// ========================================
// Request Types
// ========================================

export type CreateTemplateRequest = GeneratedCreateTemplateBody;

export type UpdateTemplateRequest = GeneratedUpdateTemplateBody;

export type CreateTemplateVersionRequest = Omit<
  GeneratedCreateTemplateVersionBody,
  "dataValidation"
>;

export type SaveFromWorkflowRequest = GeneratedSaveFromWorkflowBody & {
  /**
   * Which parts of the workflow config to include in the template.
   * Defaults to all parts when omitted. Rejects empty array with 400.
   */
  includeParts?: (
    | "prompt"
    | "schema"
    | "schemaValidationRules"
    | "notifications"
    | "frequency"
  )[];
};

export type LinkWorkflowsRequest = GeneratedLinkWorkflowsBody;

export type UnlinkWorkflowsRequest = GeneratedUnlinkWorkflowsBody;

export type ApplyVersionRequest = GeneratedApplyVersionRequest;

// ========================================
// Response Types
// ========================================

export type Template = GeneratedTemplate;

export type TemplateListItem = GeneratedTemplateListItem;

export type TemplateDetail = GeneratedTemplateDetail;

export type TemplateVersion = GeneratedTemplateVersion;

export type TemplateSchema = GeneratedTemplateSchema;

export type SaveFromWorkflowResult = GeneratedSaveFromWorkflowResult;

/** A workflow that is already linked to a different template (link 409 conflict). */
export type LinkWorkflowsConflict = GeneratedLinkWorkflowsConflict;

/**
 * Result of linking workflows. On success, `linkedCount`/`workflowIds` are set.
 * When some workflows are already linked to another template and `force` was not
 * passed, the API responds 409 and this resolves with `conflicts` populated
 * (success false) instead of throwing — inspect `conflicts` and retry with
 * `force: true` to relink.
 */
export type LinkWorkflowsResult = GeneratedLinkWorkflowsResult & {
  conflicts?: LinkWorkflowsConflict[];
};

export type UnlinkWorkflowsResult = GeneratedUnlinkWorkflowsResult;

export type ApplyVersionResult = GeneratedApplyVersionResult;

/** A workflow linked to a template, including version-drift status. */
export type TemplateLinkedWorkflow = GeneratedTemplateLinkedWorkflow;
