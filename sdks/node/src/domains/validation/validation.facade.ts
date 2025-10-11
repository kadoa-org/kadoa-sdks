import type { ValidationCoreService } from "./validation-core.service";
import type { ValidationRulesService } from "./validation-rules.service";

/**
 * Facade exposing validation operations directly on the client validation domain,
 * while preserving access to the underlying `rules` services.
 */
export interface ValidationDomain {
  /** Rule management utilities. */
  rules: ValidationRulesService;

  /**
   * Schedule a validation run for a workflow/job.
   *
   * Example: `await client.validation.schedule(workflowId, jobId)`
   */
  schedule: (
    ...args: Parameters<ValidationCoreService["scheduleValidation"]>
  ) => ReturnType<ValidationCoreService["scheduleValidation"]>;

  /** List validations for a workflow/job. */
  listWorkflowValidations: (
    ...args: Parameters<ValidationCoreService["listWorkflowValidations"]>
  ) => ReturnType<ValidationCoreService["listWorkflowValidations"]>;

  /** Get details for a specific validation. */
  getValidationDetails: (
    ...args: Parameters<ValidationCoreService["getValidationDetails"]>
  ) => ReturnType<ValidationCoreService["getValidationDetails"]>;

  /** Enable/disable validation for a workflow. */
  toggleEnabled: (
    ...args: Parameters<ValidationCoreService["toggleValidationEnabled"]>
  ) => ReturnType<ValidationCoreService["toggleValidationEnabled"]>;

  /** Get the latest validation for a workflow (optionally filtered by job). */
  getLatest: (
    ...args: Parameters<ValidationCoreService["getLatestValidation"]>
  ) => ReturnType<ValidationCoreService["getLatestValidation"]>;

  /** Get aggregated anomalies for a validation. */
  getAnomalies: (
    ...args: Parameters<ValidationCoreService["getValidationAnomalies"]>
  ) => ReturnType<ValidationCoreService["getValidationAnomalies"]>;

  /** Get anomalies for a specific rule. */
  getAnomaliesByRule: (
    ...args: Parameters<ValidationCoreService["getValidationAnomaliesByRule"]>
  ) => ReturnType<ValidationCoreService["getValidationAnomaliesByRule"]>;

  /** Wait until a validation completes; throws if validation fails. */
  waitUntilCompleted: (
    ...args: Parameters<ValidationCoreService["waitUntilCompleted"]>
  ) => ReturnType<ValidationCoreService["waitUntilCompleted"]>;
}

export function createValidationDomain(
  core: ValidationCoreService,
  rules: ValidationRulesService,
): ValidationDomain {
  return {
    rules,
    schedule: (workflowId, jobId) => core.scheduleValidation(workflowId, jobId),
    listWorkflowValidations: (filters) => core.listWorkflowValidations(filters),
    getValidationDetails: (validationId) =>
      core.getValidationDetails(validationId),
    toggleEnabled: (workflowId) => core.toggleValidationEnabled(workflowId),
    getLatest: (workflowId, jobId) =>
      core.getLatestValidation(workflowId, jobId),
    getAnomalies: (validationId) => core.getValidationAnomalies(validationId),
    getAnomaliesByRule: (validationId, ruleName) =>
      core.getValidationAnomaliesByRule(validationId, ruleName),
    waitUntilCompleted: (validationId, options) =>
      core.waitUntilCompleted(validationId, options),
  };
}
