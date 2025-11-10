"""Validation domain ACL.

Wraps generated DataValidationApi requests/responses and normalizes types.
Downstream code must import from this module instead of `openapi_client/**`.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict

from openapi_client.api.data_validation_api import DataValidationApi
from openapi_client.models.anomalies_by_rule_response import AnomaliesByRuleResponse
from openapi_client.models.anomaly_rule_page_response import AnomalyRulePageResponse
from openapi_client.models.bulk_approve_rules import BulkApproveRules
from openapi_client.models.bulk_approve_rules_response import BulkApproveRulesResponse
from openapi_client.models.bulk_delete_rules import BulkDeleteRules
from openapi_client.models.bulk_delete_rules_response import BulkDeleteRulesResponse
from openapi_client.models.create_rule import CreateRule
from openapi_client.models.data_validation_report import DataValidationReport
from openapi_client.models.delete_all_rules_response import DeleteAllRulesResponse
from openapi_client.models.delete_rule_with_reason import DeleteRuleWithReason
from openapi_client.models.disable_rule import DisableRule
from openapi_client.models.generate_rule import GenerateRule
from openapi_client.models.generate_rules import GenerateRules
from openapi_client.models.rule import Rule as GeneratedRule
from openapi_client.models.rules_list_response import RulesListResponse
from openapi_client.models.schedule_validation_response import ScheduleValidationResponse
from openapi_client.models.update_rule import UpdateRule
from openapi_client.models.v4_data_validation_workflows_workflow_id_validation_toggle_put200_response import (  # noqa: E501
    V4DataValidationWorkflowsWorkflowIdValidationTogglePut200Response as TogglePut200Response,
)
from openapi_client.models.validation_list_response import ValidationListResponse

__all__ = ["DataValidationApi"]

# ========================================
# Enum Types
# ========================================

RuleStatus = Literal["preview", "enabled", "disabled"]

RuleType = Literal["custom_sql"]

ValidationStrategy = Literal["ISOLATED", "LINKING_COLUMNS"]

IncludeDeletedRules = Literal["true", "false"]

# ========================================
# Response Types with Enum Remapping
# ========================================


class Rule(GeneratedRule):
    """Rule with SDK-curated enum types.
    
    Remaps generated enum fields to prevent type leakage.
    """

    status: RuleStatus
    rule_type: Optional[RuleType] = None

    @classmethod
    def from_generated(cls, rule: GeneratedRule) -> "Rule":
        """Create Rule from generated type."""
        return cls.model_validate(rule.model_dump())


class GetValidationResponse(DataValidationReport):
    """Validation report with SDK-curated enum types.
    
    Remaps generated enum fields to prevent type leakage.
    """

    strategy: Optional[ValidationStrategy] = None

    @classmethod
    def from_generated(cls, report: DataValidationReport) -> "GetValidationResponse":
        """Create GetValidationResponse from generated type."""
        return cls.model_validate(report.model_dump())


class ListRulesRequest(BaseModel):
    """Request to list validation rules"""

    group_id: Optional[str] = None
    workflow_id: Optional[str] = None
    status: Optional[RuleStatus] = None
    page: Optional[int] = None
    page_size: Optional[int] = None
    include_deleted: Optional[IncludeDeletedRules] = None

    model_config = ConfigDict(populate_by_name=True)


CreateRuleRequest = CreateRule
GenerateRuleRequest = GenerateRule
GenerateRulesRequest = GenerateRules
UpdateRuleRequest = UpdateRule


class DisableRuleRequest(BaseModel):
    """Request to disable a rule"""

    rule_id: str
    disable_rule: Optional[DisableRule] = None

    model_config = ConfigDict(populate_by_name=True)


BulkApproveRulesRequest = BulkApproveRules
BulkDeleteRulesRequest = BulkDeleteRules
DeleteAllRulesRequest = DeleteRuleWithReason


class ListWorkflowValidationsRequest(BaseModel):
    """Request to list validations for a workflow/job"""

    workflow_id: str
    job_id: str
    page: Optional[int] = None
    page_size: Optional[int] = None
    include_dry_run: Optional[bool] = None

    model_config = ConfigDict(populate_by_name=True)


ListRulesResponse = RulesListResponse

BulkApproveRulesResponseData = BulkApproveRulesResponse
BulkDeleteRulesResponseData = BulkDeleteRulesResponse
DeleteAllRulesResponseData = DeleteAllRulesResponse

ListValidationsResponse = ValidationListResponse

ToggleValidationResponse = TogglePut200Response

ScheduleValidationResponse = ScheduleValidationResponse

GetAnomaliesByRuleResponse = AnomaliesByRuleResponse
GetAnomalyRulePageResponse = AnomalyRulePageResponse

__all__ = [
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
