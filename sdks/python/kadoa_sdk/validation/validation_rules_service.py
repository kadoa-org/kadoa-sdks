"""Validation rules service for managing validation rules."""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from kadoa_sdk.core.logger import validation as logger

if TYPE_CHECKING:  # pragma: no cover
    from kadoa_sdk.client import KadoaClient

from kadoa_sdk.core.exceptions import KadoaHttpError
from kadoa_sdk.core.http import get_validation_api

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
    ListRulesRequest,
    ListRulesResponse,
    Rule,
    UpdateRuleRequest,
)

debug = logger.debug


class ValidationRulesService:
    """Service for managing data validation rules"""

    def __init__(self, client: "KadoaClient") -> None:
        """
        Args:
            client: KadoaClient instance
        """
        self.client = client
        self._validation_api: Optional[DataValidationApi] = None

    @property
    def validation_api(self) -> DataValidationApi:
        """Lazy-load validation API"""
        if self._validation_api is None:
            self._validation_api = get_validation_api(self.client)
        return self._validation_api

    def list_rules(self, options: Optional[ListRulesRequest] = None) -> ListRulesResponse:
        """
        List validation rules with filtering.

        Args:
            options: Optional filters for listing rules

        Returns:
            List of validation rules

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            filters = options or ListRulesRequest()
            response = self.validation_api.v4_data_validation_rules_get(
                group_id=filters.group_id,
                workflow_id=filters.workflow_id,
                status=filters.status,
                page=filters.page,
                page_size=filters.page_size,
                include_deleted=filters.include_deleted,
            )

            # Check for errors - response may not have status_code attribute
            has_error = False
            if hasattr(response, "status_code") and response.status_code != 200:
                has_error = True
            elif (
                hasattr(response, "data")
                and hasattr(response.data, "error")
                and response.data.error
            ):
                has_error = True

            if has_error:
                raise KadoaHttpError.wrap(
                    response.data.data
                    if hasattr(response, "data") and hasattr(response.data, "data")
                    else response.data
                    if hasattr(response, "data")
                    else response,
                    message="Failed to list validation rules",
                )

            return response.data if hasattr(response, "data") else response
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to list validation rules",
            )

    def get_rule_by_id(self, rule_id: str) -> Optional[Rule]:
        """
        Get rule by ID.

        Args:
            rule_id: Rule ID

        Returns:
            Rule if found, None otherwise

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.validation_api.v4_data_validation_rules_rule_id_get(rule_id=rule_id)

            # Check for errors - response may not have status_code attribute
            has_error = False
            if hasattr(response, "status_code") and response.status_code != 200:
                has_error = True
            elif (
                hasattr(response, "data")
                and hasattr(response.data, "error")
                and response.data.error
            ):
                has_error = True

            if has_error:
                raise KadoaHttpError.wrap(
                    response.data.data
                    if hasattr(response, "data") and hasattr(response.data, "data")
                    else response.data
                    if hasattr(response, "data")
                    else response,
                    message="Failed to get validation rule by id",
                )

            rule_data = (
                response.data.data
                if hasattr(response, "data") and hasattr(response.data, "data")
                else response.data
                if hasattr(response, "data")
                else None
            )
            if rule_data is None:
                return None
            # Convert to SDK Rule type with enum remapping
            from openapi_client.models.rule import Rule as GeneratedRule
            if isinstance(rule_data, GeneratedRule):
                return Rule.from_generated(rule_data)
            return rule_data
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to get validation rule by id",
                details={"ruleId": rule_id},
            )

    def get_rule_by_name(self, name: str) -> Optional[Rule]:
        """
        Get rule by name.

        Args:
            name: Rule name

        Returns:
            Rule if found, None otherwise

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.validation_api.v4_data_validation_rules_get()

            # Check for errors - response may not have status_code attribute
            has_error = False
            if hasattr(response, "status_code") and response.status_code != 200:
                has_error = True
            elif (
                hasattr(response, "data")
                and hasattr(response.data, "error")
                and response.data.error
            ):
                has_error = True

            if has_error:
                raise KadoaHttpError.wrap(
                    response.data.data
                    if hasattr(response, "data") and hasattr(response.data, "data")
                    else response.data
                    if hasattr(response, "data")
                    else response,
                    message="Failed to get validation rule by name",
                )

            rules_data = (
                response.data.data
                if hasattr(response, "data") and hasattr(response.data, "data")
                else []
            )

            if rules_data:
                from openapi_client.models.rule import Rule as GeneratedRule
                for rule in rules_data:
                    rule_name = None
                    if hasattr(rule, "name"):
                        rule_name = rule.name
                    elif isinstance(rule, dict):
                        rule_name = rule.get("name")
                    
                    if rule_name == name:
                        if isinstance(rule, GeneratedRule):
                            return Rule.from_generated(rule)
                        return rule

            return None
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to get validation rule by name",
                details={"name": name},
            )

    def create_rule(self, data: CreateRuleRequest) -> Rule:
        """
        Create a validation rule.

        Args:
            data: Create rule request data

        Returns:
            Created rule

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.validation_api.v4_data_validation_rules_post(create_rule=data)

            # Check for errors - response may not have status_code attribute
            has_error = False
            if hasattr(response, "status_code") and response.status_code != 200:
                has_error = True
            elif (
                hasattr(response, "data")
                and hasattr(response.data, "error")
                and response.data.error
            ):
                has_error = True

            if has_error:
                error_message = (
                    response.data.message
                    if hasattr(response, "data") and hasattr(response.data, "message")
                    else "Failed to create validation rule"
                )
                raise KadoaHttpError.wrap(
                    response.data.data
                    if hasattr(response, "data") and hasattr(response.data, "data")
                    else response.data
                    if hasattr(response, "data")
                    else response,
                    message=error_message,
                )

            rule_data = (
                response.data.data
                if hasattr(response, "data") and hasattr(response.data, "data")
                else response.data
                if hasattr(response, "data")
                else response
            )
            # Convert to SDK Rule type with enum remapping
            from openapi_client.models.rule import Rule as GeneratedRule
            if isinstance(rule_data, GeneratedRule):
                return Rule.from_generated(rule_data)
            return rule_data
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to create validation rule",
            )

    def update_rule(self, rule_id: str, update_data: UpdateRuleRequest) -> Rule:
        """
        Update an existing rule.

        Args:
            rule_id: Rule ID
            update_data: Update rule request data

        Returns:
            Updated rule

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.validation_api.v4_data_validation_rules_rule_id_put(
                rule_id=rule_id, update_rule=update_data
            )

            # Check for errors - response may not have status_code attribute
            has_error = False
            if hasattr(response, "status_code") and response.status_code != 200:
                has_error = True
            elif (
                hasattr(response, "data")
                and hasattr(response.data, "error")
                and response.data.error
            ):
                has_error = True

            if has_error:
                error_message = (
                    response.data.message
                    if hasattr(response, "data") and hasattr(response.data, "message")
                    else "Failed to update validation rule"
                )
                raise KadoaHttpError.wrap(
                    response.data.data
                    if hasattr(response, "data") and hasattr(response.data, "data")
                    else response.data
                    if hasattr(response, "data")
                    else response,
                    message=error_message,
                )

            rule_data = (
                response.data.data
                if hasattr(response, "data") and hasattr(response.data, "data")
                else response.data
                if hasattr(response, "data")
                else response
            )
            # Convert to SDK Rule type with enum remapping
            from openapi_client.models.rule import Rule as GeneratedRule
            if isinstance(rule_data, GeneratedRule):
                return Rule.from_generated(rule_data)
            return rule_data
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to update validation rule",
                details={"ruleId": rule_id},
            )

    def disable_rule(self, data: DisableRuleRequest) -> Rule:
        """
        Disable a rule.

        Args:
            data: Disable rule request data

        Returns:
            Disabled rule

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.validation_api.v4_data_validation_rules_rule_id_disable_post(
                rule_id=data.rule_id, disable_rule=data.disable_rule
            )

            # Check for errors - response may not have status_code attribute
            has_error = False
            if hasattr(response, "status_code") and response.status_code != 200:
                has_error = True
            elif (
                hasattr(response, "data")
                and hasattr(response.data, "error")
                and response.data.error
            ):
                has_error = True

            if has_error:
                error_message = (
                    response.data.message
                    if hasattr(response, "data") and hasattr(response.data, "message")
                    else "Failed to disable validation rule"
                )
                raise KadoaHttpError.wrap(
                    response.data.data
                    if hasattr(response, "data") and hasattr(response.data, "data")
                    else response.data
                    if hasattr(response, "data")
                    else response,
                    message=error_message,
                )

            rule_data = (
                response.data.data
                if hasattr(response, "data") and hasattr(response.data, "data")
                else response.data
                if hasattr(response, "data")
                else response
            )
            # Convert to SDK Rule type with enum remapping
            from openapi_client.models.rule import Rule as GeneratedRule
            if isinstance(rule_data, GeneratedRule):
                return Rule.from_generated(rule_data)
            return rule_data
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to disable validation rule",
                details={"ruleId": data.rule_id},
            )

    def generate_rule(self, data: GenerateRuleRequest) -> Rule:
        """
        Generate a rule using AI.

        Args:
            data: Generate rule request data

        Returns:
            Generated rule

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.validation_api.v4_data_validation_rules_actions_generate_post(
                generate_rule=data
            )

            # Check for errors - response may not have status_code attribute
            has_error = False
            if hasattr(response, "status_code") and response.status_code != 200:
                has_error = True
            elif (
                hasattr(response, "data")
                and hasattr(response.data, "error")
                and response.data.error
            ):
                has_error = True

            if has_error:
                error_message = (
                    response.data.message
                    if hasattr(response, "data") and hasattr(response.data, "message")
                    else "Failed to generate validation rule"
                )
                raise KadoaHttpError.wrap(
                    response.data.data
                    if hasattr(response, "data") and hasattr(response.data, "data")
                    else response.data
                    if hasattr(response, "data")
                    else response,
                    message=error_message,
                )

            rule_data = (
                response.data.data
                if hasattr(response, "data") and hasattr(response.data, "data")
                else response.data
                if hasattr(response, "data")
                else response
            )
            # Convert to SDK Rule type with enum remapping
            from openapi_client.models.rule import Rule as GeneratedRule
            if isinstance(rule_data, GeneratedRule):
                return Rule.from_generated(rule_data)
            return rule_data
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to generate validation rule",
            )

    def generate_rules(self, data: GenerateRulesRequest) -> list[Rule]:
        """
        Generate multiple rules using AI.

        Args:
            data: Generate rules request data

        Returns:
            List of generated rules

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.validation_api.v4_data_validation_rules_actions_generate_rules_post(
                generate_rules=data
            )

            # Check for errors - response may not have status_code attribute
            has_error = False
            if hasattr(response, "status_code") and response.status_code != 200:
                has_error = True
            elif (
                hasattr(response, "data")
                and hasattr(response.data, "error")
                and response.data.error
            ):
                has_error = True

            if has_error:
                error_message = (
                    response.data.message
                    if hasattr(response, "data") and hasattr(response.data, "message")
                    else "Failed to generate validation rules"
                )
                raise KadoaHttpError.wrap(
                    response.data.data
                    if hasattr(response, "data") and hasattr(response.data, "data")
                    else response.data
                    if hasattr(response, "data")
                    else response,
                    message=error_message,
                )

            rules_data = (
                response.data.data
                if hasattr(response, "data") and hasattr(response.data, "data")
                else response.data
                if hasattr(response, "data")
                else []
            )
            # Convert list of rules to SDK Rule types with enum remapping
            from openapi_client.models.rule import Rule as GeneratedRule
            if isinstance(rules_data, list):
                return [
                    Rule.from_generated(rule) if isinstance(rule, GeneratedRule) else rule
                    for rule in rules_data
                ]
            return rules_data
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to generate validation rules",
            )

    def bulk_approve_rules(self, data: BulkApproveRulesRequest) -> BulkApproveRulesResponseData:
        """
        Bulk approve rules.

        Args:
            data: Bulk approve rules request data

        Returns:
            Bulk approve response data

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.validation_api.v4_data_validation_rules_actions_bulk_approve_post(
                bulk_approve_rules=data
            )

            # Check for errors - response may not have status_code attribute
            has_error = False
            if hasattr(response, "status_code") and response.status_code != 200:
                has_error = True
            elif (
                hasattr(response, "data")
                and hasattr(response.data, "error")
                and response.data.error
            ):
                has_error = True

            if has_error:
                error_message = (
                    response.data.message
                    if hasattr(response, "data") and hasattr(response.data, "message")
                    else "Failed to bulk approve validation rules"
                )
                raise KadoaHttpError.wrap(
                    response.data.data
                    if hasattr(response, "data") and hasattr(response.data, "data")
                    else response.data
                    if hasattr(response, "data")
                    else response,
                    message=error_message,
                )

            rule_data = (
                response.data.data
                if hasattr(response, "data") and hasattr(response.data, "data")
                else response.data
                if hasattr(response, "data")
                else response
            )
            # Convert to SDK Rule type with enum remapping
            from openapi_client.models.rule import Rule as GeneratedRule
            if isinstance(rule_data, GeneratedRule):
                return Rule.from_generated(rule_data)
            return rule_data
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to bulk approve validation rules",
            )

    def bulk_delete_rules(self, data: BulkDeleteRulesRequest) -> BulkDeleteRulesResponseData:
        """
        Bulk delete rules.

        Args:
            data: Bulk delete rules request data

        Returns:
            Bulk delete response data

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.validation_api.v4_data_validation_rules_actions_bulk_delete_post(
                bulk_delete_rules=data
            )

            # Check for errors - response may not have status_code attribute
            has_error = False
            if hasattr(response, "status_code") and response.status_code != 200:
                has_error = True
            elif (
                hasattr(response, "data")
                and hasattr(response.data, "error")
                and response.data.error
            ):
                has_error = True

            if has_error:
                error_message = (
                    response.data.message
                    if hasattr(response, "data") and hasattr(response.data, "message")
                    else "Failed to bulk delete validation rules"
                )
                raise KadoaHttpError.wrap(
                    response.data.data
                    if hasattr(response, "data") and hasattr(response.data, "data")
                    else response.data
                    if hasattr(response, "data")
                    else response,
                    message=error_message,
                )

            rule_data = (
                response.data.data
                if hasattr(response, "data") and hasattr(response.data, "data")
                else response.data
                if hasattr(response, "data")
                else response
            )
            # Convert to SDK Rule type with enum remapping
            from openapi_client.models.rule import Rule as GeneratedRule
            if isinstance(rule_data, GeneratedRule):
                return Rule.from_generated(rule_data)
            return rule_data
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to bulk delete validation rules",
            )

    def delete_all_rules(self, data: DeleteAllRulesRequest) -> DeleteAllRulesResponseData:
        """
        Delete all rules for a workflow.

        Args:
            data: Delete all rules request data

        Returns:
            Delete all response data

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.validation_api.v4_data_validation_rules_actions_delete_all_delete(
                delete_rule_with_reason=data
            )

            # Check for errors - response may not have status_code attribute
            has_error = False
            if hasattr(response, "status_code") and response.status_code != 200:
                has_error = True
            elif (
                hasattr(response, "data")
                and hasattr(response.data, "error")
                and response.data.error
            ):
                has_error = True

            if has_error:
                error_message = (
                    response.data.message
                    if hasattr(response, "data") and hasattr(response.data, "message")
                    else "Failed to delete all validation rules"
                )
                raise KadoaHttpError.wrap(
                    response.data.data
                    if hasattr(response, "data") and hasattr(response.data, "data")
                    else response.data
                    if hasattr(response, "data")
                    else response,
                    message=error_message,
                )

            rule_data = (
                response.data.data
                if hasattr(response, "data") and hasattr(response.data, "data")
                else response.data
                if hasattr(response, "data")
                else response
            )
            # Convert to SDK Rule type with enum remapping
            from openapi_client.models.rule import Rule as GeneratedRule
            if isinstance(rule_data, GeneratedRule):
                return Rule.from_generated(rule_data)
            return rule_data
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to delete all validation rules",
            )
