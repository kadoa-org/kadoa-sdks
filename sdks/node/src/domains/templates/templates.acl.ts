/**
 * Templates domain ACL.
 * Wraps generated TemplatesApi requests/responses and normalizes types.
 * Downstream code must import from this module instead of `generated/**`.
 */

import {
  // Request types
  type CreateTemplateBody as GeneratedCreateTemplateBody,
  type CreateTemplateVersionBody as GeneratedCreateTemplateVersionBody,
  type LinkWorkflowsBody as GeneratedLinkWorkflowsBody,
  // Response types
  type LinkWorkflowsResponse as GeneratedLinkWorkflowsResult,
  type SaveFromWorkflowBody as GeneratedSaveFromWorkflowBody,
  type SaveFromWorkflowResponseData as GeneratedSaveFromWorkflowResult,
  type TemplateCreatedResponseData as GeneratedTemplate,
  type TemplateDetailResponseBodyData as GeneratedTemplateDetail,
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
  includeParts?: ("prompt" | "schema" | "notifications")[];
};

export type LinkWorkflowsRequest = GeneratedLinkWorkflowsBody;

export type UnlinkWorkflowsRequest = GeneratedUnlinkWorkflowsBody;

// ========================================
// Response Types
// ========================================

export type Template = GeneratedTemplate;

export type TemplateListItem = GeneratedTemplateListItem;

export type TemplateDetail = GeneratedTemplateDetail;

export type TemplateVersion = GeneratedTemplateVersion;

export type TemplateSchema = GeneratedTemplateSchema;

export type SaveFromWorkflowResult = GeneratedSaveFromWorkflowResult;

export type LinkWorkflowsResult = GeneratedLinkWorkflowsResult;

export type UnlinkWorkflowsResult = GeneratedUnlinkWorkflowsResult;
