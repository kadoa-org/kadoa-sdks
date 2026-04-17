/**
 * Templates domain ACL.
 * Wraps generated TemplatesApi requests/responses and normalizes types.
 * Downstream code must import from this module instead of `generated/**`.
 */

import {
  // API Client
  TemplatesApi,

  // Request types
  type ApplyTemplateUpdateBody as GeneratedApplyTemplateUpdateBody,
  type CreateTemplateBody as GeneratedCreateTemplateBody,
  type CreateTemplateVersionBody as GeneratedCreateTemplateVersionBody,
  type LinkWorkflowsBody as GeneratedLinkWorkflowsBody,
  type SaveFromWorkflowBody as GeneratedSaveFromWorkflowBody,
  type UnlinkWorkflowsBody as GeneratedUnlinkWorkflowsBody,
  type UpdateTemplateBody as GeneratedUpdateTemplateBody,

  // Response types
  type ApplyTemplateUpdateResponse as GeneratedApplyTemplateUpdateResponse,
  type LinkWorkflowsResponse as GeneratedLinkWorkflowsResponse,
  type SaveFromWorkflowResponseData as GeneratedSaveFromWorkflowResult,
  type TemplateCreatedResponseData as GeneratedTemplate,
  type TemplateDetailResponseBodyData as GeneratedTemplateDetail,
  type TemplateResponse as GeneratedTemplateListItem,
  type TemplateSchemasResponseDataInner as GeneratedTemplateSchema,
  type TemplateVersionCreatedResponseData as GeneratedTemplateVersion,
  type TemplateWorkflowsResponseDataInner as GeneratedTemplateWorkflow,
  type UnlinkWorkflowsResponse as GeneratedUnlinkWorkflowsResponse,
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

export type CreateTemplateVersionRequest = GeneratedCreateTemplateVersionBody;

export type LinkWorkflowsRequest = GeneratedLinkWorkflowsBody;

export type UnlinkWorkflowsRequest = GeneratedUnlinkWorkflowsBody;

export type ApplyTemplateUpdateRequest = GeneratedApplyTemplateUpdateBody;

export type SaveFromWorkflowRequest = GeneratedSaveFromWorkflowBody & {
  /**
   * Which parts of the workflow config to include in the template.
   * Defaults to all parts when omitted. Rejects empty array with 400.
   */
  includeParts?: ("prompt" | "schema" | "notifications")[];
};

// ========================================
// Response Types
// ========================================

export type Template = GeneratedTemplate;

export type TemplateListItem = GeneratedTemplateListItem;

export type TemplateDetail = GeneratedTemplateDetail;

export type TemplateVersion = GeneratedTemplateVersion;

export type TemplateSchema = GeneratedTemplateSchema;

export type TemplateWorkflow = GeneratedTemplateWorkflow;

export type LinkWorkflowsResult = GeneratedLinkWorkflowsResponse;

export type UnlinkWorkflowsResult = GeneratedUnlinkWorkflowsResponse;

export type ApplyTemplateUpdateResult = GeneratedApplyTemplateUpdateResponse;

export type SaveFromWorkflowResult = GeneratedSaveFromWorkflowResult;
