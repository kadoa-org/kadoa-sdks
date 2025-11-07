from typing import Optional

from .validation_acl import (
    BulkApproveRulesRequest,
    BulkApproveRulesResponseData,
    BulkDeleteRulesRequest,
    BulkDeleteRulesResponseData,
    CreateRuleRequest,
    DataValidationApi,
    DeleteAllRulesRequest,
    DeleteAllRulesResponseData,
    DisableRuleRequest,
    GenerateRuleRequest,
    GenerateRulesRequest,
    GetAnomaliesByRuleResponse,
    GetAnomalyRulePageResponse,
    GetValidationResponse,
    IncludeDeletedRules,
    ListRulesRequest,
    ListRulesResponse,
    ListValidationsResponse,
    ListWorkflowValidationsRequest,
    Rule,
    RuleStatus,
    RuleType,
    ScheduleValidationResponse,
    ToggleValidationResponse,
    UpdateRuleRequest,
    ValidationStrategy,
)
from .validation_core_service import ValidationCoreService
from .validation_rules_service import ValidationRulesService


class ValidationDomain:
    """Validation domain providing access to core validation operations and rules management"""

    def __init__(
        self,
        core: ValidationCoreService,
        rules: ValidationRulesService,
    ) -> None:
        """
        Args:
            core: ValidationCoreService instance
            rules: ValidationRulesService instance
        """
        self.rules = rules
        self._core = core

    def schedule(self, workflow_id: str, job_id: str) -> ScheduleValidationResponse:
        """Schedule a validation run for a workflow/job.

        Args:
            workflow_id: Workflow ID
            job_id: Job ID

        Returns:
            Schedule validation response
        """
        return self._core.schedule_validation(workflow_id, job_id)

    def list_workflow_validations(
        self, filters: ListWorkflowValidationsRequest
    ) -> ListValidationsResponse:
        """List validations for a workflow/job.

        Args:
            filters: Request filters including workflow_id, job_id, and pagination

        Returns:
            List of validations
        """
        return self._core.list_workflow_validations(filters)

    def get_validation_details(self, validation_id: str) -> GetValidationResponse:
        """Get details for a specific validation.

        Args:
            validation_id: Validation ID

        Returns:
            Validation details
        """
        return self._core.get_validation_details(validation_id)

    def toggle_enabled(self, workflow_id: str) -> ToggleValidationResponse:
        """Enable/disable validation for a workflow.

        Args:
            workflow_id: Workflow ID

        Returns:
            Toggle validation response
        """
        return self._core.toggle_validation_enabled(workflow_id)

    def get_latest(self, workflow_id: str, job_id: Optional[str] = None) -> GetValidationResponse:
        """Get the latest validation for a workflow (optionally filtered by job).

        Args:
            workflow_id: Workflow ID
            job_id: Optional job ID to filter by

        Returns:
            Latest validation details
        """
        return self._core.get_latest_validation(workflow_id, job_id)

    def get_anomalies(self, validation_id: str) -> GetAnomaliesByRuleResponse:
        """Get aggregated anomalies for a validation.

        Args:
            validation_id: Validation ID

        Returns:
            Anomalies grouped by rule
        """
        return self._core.get_validation_anomalies(validation_id)

    def get_anomalies_by_rule(
        self, validation_id: str, rule_name: str
    ) -> GetAnomalyRulePageResponse:
        """Get anomalies for a specific rule.

        Args:
            validation_id: Validation ID
            rule_name: Rule name

        Returns:
            Anomalies for the specified rule
        """
        return self._core.get_validation_anomalies_by_rule(validation_id, rule_name)

    def wait_until_completed(
        self,
        validation_id: str,
        poll_interval_ms: Optional[int] = None,
        timeout_ms: Optional[int] = None,
    ) -> GetValidationResponse:
        """Wait until a validation completes; throws if validation fails.

        Args:
            validation_id: Validation ID
            poll_interval_ms: Polling interval in milliseconds (default: 1000)
            timeout_ms: Timeout in milliseconds (default: 300000)

        Returns:
            Validation response when completed
        """
        return self._core.wait_until_completed(validation_id, poll_interval_ms, timeout_ms)


__all__ = [
    "ValidationCoreService",
    "ValidationRulesService",
    "ValidationDomain",
    "DataValidationApi",
    "RuleStatus",
    "RuleType",
    "ValidationStrategy",
    "IncludeDeletedRules",
    "ListRulesRequest",
    "CreateRuleRequest",
    "GenerateRuleRequest",
    "GenerateRulesRequest",
    "UpdateRuleRequest",
    "DisableRuleRequest",
    "BulkApproveRulesRequest",
    "BulkDeleteRulesRequest",
    "DeleteAllRulesRequest",
    "ListWorkflowValidationsRequest",
    "Rule",
    "ListRulesResponse",
    "BulkApproveRulesResponseData",
    "BulkDeleteRulesResponseData",
    "DeleteAllRulesResponseData",
    "ListValidationsResponse",
    "GetValidationResponse",
    "ToggleValidationResponse",
    "ScheduleValidationResponse",
    "GetAnomaliesByRuleResponse",
    "GetAnomalyRulePageResponse",
]
