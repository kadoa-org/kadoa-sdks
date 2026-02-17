/**
 * Validation domain ACL.
 * Wraps generated DataValidationApi requests/responses and normalizes enums.
 * Downstream code must import from this module instead of `generated/**`.
 */

import {
  type AnomaliesByRuleResponse,
  type AnomalyRulePageResponse,
  type BulkApproveRules,
  type BulkApproveRulesResponse,
  type BulkDeleteRules,
  type BulkDeleteRulesResponse,
  DataValidationApi,
  type DataValidationApiV4DataValidationRulesGetRequest,
  type DataValidationApiV4DataValidationWorkflowsWorkflowIdJobsJobIdValidationsGetRequest,
  type DataValidationReportStrategyEnum,
  type DeleteAllRulesResponse,
  type DeleteRuleWithReason,
  type DisableRule,
  type DataValidationReport as GeneratedDataValidationReport,
  type Rule as GeneratedRule,
  type RuleRuleTypeEnum as GeneratedRuleTypeEnum,
  type GenerateRule,
  type GenerateRules,
  type RuleDeleteResponse,
  type RulesListResponse,
  type ScheduleValidationResponse,
  type V4DataValidationRulesGetIncludeDeletedParameter,
  type V4DataValidationRulesGetStatusEnum,
  type V4DataValidationWorkflowsWorkflowIdValidationTogglePut200Response,
  type ValidationListResponse,
} from "../../generated";

// ========================================
// API Client
// ========================================

export { DataValidationApi };

// ========================================
// Enums
// ========================================

/**
 * Rule status enum.
 */
export const RuleStatus = {
  Preview: "preview",
  Enabled: "enabled",
  Disabled: "disabled",
} as const satisfies Record<
  keyof typeof V4DataValidationRulesGetStatusEnum,
  V4DataValidationRulesGetStatusEnum
>;

export type RuleStatus = (typeof RuleStatus)[keyof typeof RuleStatus];

/**
 * Rule type enum.
 */
export const RuleType = {
  CustomSql: "custom_sql",
} as const satisfies Record<
  keyof typeof GeneratedRuleTypeEnum,
  (typeof GeneratedRuleTypeEnum)[keyof typeof GeneratedRuleTypeEnum]
>;

export type RuleType = (typeof RuleType)[keyof typeof RuleType];

/**
 * Validation strategy enum.
 */
export const ValidationStrategy = {
  Isolated: "ISOLATED",
  LinkingColumns: "LINKING_COLUMNS",
} as const satisfies Record<
  keyof typeof DataValidationReportStrategyEnum,
  (typeof DataValidationReportStrategyEnum)[keyof typeof DataValidationReportStrategyEnum]
>;

export type ValidationStrategy =
  (typeof ValidationStrategy)[keyof typeof ValidationStrategy];

/**
 * Include deleted rules parameter.
 */
export type IncludeDeletedRules =
  V4DataValidationRulesGetIncludeDeletedParameter;

// ========================================
// Request Types
// ========================================

export class ListRulesRequest
  implements DataValidationApiV4DataValidationRulesGetRequest
{
  groupId?: string;
  workflowId?: string;
  status?: RuleStatus;
  page?: number;
  pageSize?: number;
  includeDeleted?: IncludeDeletedRules;
}

export type GenerateRuleRequest = GenerateRule;

export type GenerateRulesRequest = GenerateRules;

export interface DisableRuleRequest {
  ruleId: string;
  disableRule?: DisableRule;
}

export type BulkApproveRulesRequest = BulkApproveRules;

export type BulkDeleteRulesRequest = BulkDeleteRules;

export type DeleteAllRulesRequest = DeleteRuleWithReason;

export interface DeleteRuleRequest {
  ruleId: string;
  workflowId?: string;
  reason?: string;
}

// ========================================
// Response Types
// ========================================

/**
 * Rule with SDK-curated enum types.
 * Remaps generated enum fields to prevent type leakage.
 */
export interface Rule extends Omit<GeneratedRule, "status" | "ruleType"> {
  status: RuleStatus;
  ruleType?: RuleType;
}

export type ListRulesResponse = RulesListResponse;

export type BulkApproveRulesResponseData = BulkApproveRulesResponse["data"];

export type BulkDeleteRulesResponseData = BulkDeleteRulesResponse["data"];

export type DeleteAllRulesResponseData = DeleteAllRulesResponse["data"];

export type { RuleDeleteResponse };

// ========================================
// Validation Operations Types
// ========================================

export class ListWorkflowValidationsRequest
  implements
    DataValidationApiV4DataValidationWorkflowsWorkflowIdJobsJobIdValidationsGetRequest
{
  workflowId!: string;
  jobId!: string;
  page?: number;
  pageSize?: number;
  includeDryRun?: boolean | null;
}

export type ListValidationsResponse = ValidationListResponse;

/**
 * Validation report with SDK-curated enum types.
 */
export interface GetValidationResponse
  extends Omit<GeneratedDataValidationReport, "strategy"> {
  strategy?: ValidationStrategy;
}

export type ToggleValidationResponse =
  V4DataValidationWorkflowsWorkflowIdValidationTogglePut200Response;

export type { ScheduleValidationResponse };

export type GetAnomaliesByRuleResponse = AnomaliesByRuleResponse;

export type GetAnomalyRulePageResponse = AnomalyRulePageResponse;
