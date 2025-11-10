"""Validation core service for managing validation operations."""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from kadoa_sdk.core.exceptions import KadoaErrorCode, KadoaHttpError, KadoaSdkError
from kadoa_sdk.core.http import get_validation_api
from kadoa_sdk.core.logger import validation as logger
from kadoa_sdk.core.utils import PollingOptions, poll_until

if TYPE_CHECKING:  # pragma: no cover
    from kadoa_sdk.client import KadoaClient
from .validation_acl import (
    DataValidationApi,
    GetAnomaliesByRuleResponse,
    GetAnomalyRulePageResponse,
    GetValidationResponse,
    ListValidationsResponse,
    ListWorkflowValidationsRequest,
    ScheduleValidationResponse,
    ToggleValidationResponse,
)

debug = logger.debug


class ValidationCoreService:
    """Service for managing validation operations"""

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

    def list_workflow_validations(
        self, filters: ListWorkflowValidationsRequest
    ) -> ListValidationsResponse:
        """
        List validations for a workflow/job.

        Args:
            filters: Request filters including workflow_id, job_id, and pagination

        Returns:
            List of validations

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.validation_api.v4_data_validation_workflows_workflow_id_jobs_job_id_validations_get(  # noqa: E501
                workflow_id=filters.workflow_id,
                job_id=filters.job_id,
                page=filters.page,
                page_size=filters.page_size,
                include_dry_run=filters.include_dry_run,
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
                    response.data if hasattr(response, "data") else response,
                    message="Failed to list workflow validations",
                )

            return response.data if hasattr(response, "data") else response
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to list workflow validations",
                details={
                    "workflowId": filters.workflow_id,
                    "jobId": filters.job_id,
                },
            )

    def get_validation_details(self, validation_id: str) -> GetValidationResponse:
        """
        Get validation details by ID.

        Args:
            validation_id: Validation ID

        Returns:
            Validation details

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.validation_api.v4_data_validation_validations_validation_id_get(
                validation_id=validation_id
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
                    response.data if hasattr(response, "data") else response,
                    message="Failed to get validation details",
                )

            validation_data = response.data if hasattr(response, "data") else response
            # Convert to SDK GetValidationResponse type with enum remapping
            from openapi_client.models.data_validation_report import DataValidationReport
            if isinstance(validation_data, DataValidationReport):
                return GetValidationResponse.from_generated(validation_data)
            return validation_data
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to get validation details",
                details={"validationId": validation_id},
            )

    def schedule_validation(self, workflow_id: str, job_id: str) -> ScheduleValidationResponse:
        """
        Schedule a validation run for a workflow/job.

        Args:
            workflow_id: Workflow ID
            job_id: Job ID

        Returns:
            Schedule validation response

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.validation_api.v4_data_validation_workflows_workflow_id_jobs_job_id_validate_post(  # noqa: E501
                workflow_id=workflow_id, job_id=job_id
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
                    else "Failed to schedule validation"
                )
                raise KadoaHttpError.wrap(
                    response.data if hasattr(response, "data") else response,
                    message=error_message,
                )

            return response.data if hasattr(response, "data") else response
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to schedule validation",
                details={"workflowId": workflow_id, "jobId": job_id},
            )

    def toggle_validation_enabled(self, workflow_id: str) -> ToggleValidationResponse:
        """
        Enable/disable validation for a workflow.

        Args:
            workflow_id: Workflow ID

        Returns:
            Toggle validation response

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = (
                self.validation_api.v4_data_validation_workflows_workflow_id_validation_toggle_put(
                    workflow_id=workflow_id
                )
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
                    else "Failed to toggle validation"
                )
                raise KadoaHttpError.wrap(
                    response.data if hasattr(response, "data") else response,
                    message=error_message,
                )

            return response.data if hasattr(response, "data") else response
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to toggle validation",
                details={"workflowId": workflow_id},
            )

    def get_latest_validation(
        self, workflow_id: str, job_id: Optional[str] = None
    ) -> GetValidationResponse:
        """
        Get the latest validation for a workflow (optionally filtered by job).

        Args:
            workflow_id: Workflow ID
            job_id: Optional job ID to filter by

        Returns:
            Latest validation details

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            if job_id:
                response = self.validation_api.v4_data_validation_workflows_workflow_id_jobs_job_id_validations_latest_get(  # noqa: E501
                    workflow_id=workflow_id, job_id=job_id
                )
            else:
                response = self.validation_api.v4_data_validation_workflows_workflow_id_validations_latest_get(  # noqa: E501
                    workflow_id=workflow_id
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
                    response.data if hasattr(response, "data") else response,
                    message="Failed to get latest validation",
                )

            validation_data = response.data if hasattr(response, "data") else response
            # Convert to SDK GetValidationResponse type with enum remapping
            from openapi_client.models.data_validation_report import DataValidationReport
            if isinstance(validation_data, DataValidationReport):
                return GetValidationResponse.from_generated(validation_data)
            return validation_data
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to get latest validation",
                details={"workflowId": workflow_id, "jobId": job_id},
            )

    def get_validation_anomalies(self, validation_id: str) -> GetAnomaliesByRuleResponse:
        """
        Get aggregated anomalies for a validation.

        Args:
            validation_id: Validation ID

        Returns:
            Anomalies grouped by rule

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = (
                self.validation_api.v4_data_validation_validations_validation_id_anomalies_get(
                    validation_id=validation_id
                )
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
                    response.data if hasattr(response, "data") else response,
                    message="Failed to get validation anomalies",
                )

            return response.data if hasattr(response, "data") else response
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to get validation anomalies",
                details={"validationId": validation_id},
            )

    def get_validation_anomalies_by_rule(
        self, validation_id: str, rule_name: str
    ) -> GetAnomalyRulePageResponse:
        """
        Get anomalies for a specific rule.

        Args:
            validation_id: Validation ID
            rule_name: Rule name

        Returns:
            Anomalies for the specified rule

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.validation_api.v4_data_validation_validations_validation_id_anomalies_rules_rule_name_get(  # noqa: E501
                validation_id=validation_id, rule_name=rule_name
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
                    response.data if hasattr(response, "data") else response,
                    message="Failed to get validation anomalies by rule",
                )

            return response.data if hasattr(response, "data") else response
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to get validation anomalies by rule",
                details={"validationId": validation_id, "ruleName": rule_name},
            )

    def wait_until_completed(
        self,
        validation_id: str,
        poll_interval_ms: Optional[int] = None,
        timeout_ms: Optional[int] = None,
    ) -> GetValidationResponse:
        """
        Wait until a validation completes; throws if validation fails.

        Args:
            validation_id: Validation ID
            poll_interval_ms: Polling interval in milliseconds (default: 1000)
            timeout_ms: Timeout in milliseconds (default: 300000)

        Returns:
            Validation response when completed

        Raises:
            KadoaSdkError: If validation fails or timeout occurs
        """
        options = PollingOptions(poll_interval_ms=poll_interval_ms, timeout_ms=timeout_ms)

        def poll_fn() -> GetValidationResponse:
            current = self.get_validation_details(validation_id)

            if hasattr(current, "error") and current.error:
                error_msg = (
                    getattr(current, "message", None) or str(current.error) or "Validation failed"
                )
                raise KadoaSdkError(
                    f"Validation failed: {error_msg}",
                    code=KadoaErrorCode.VALIDATION_ERROR,
                    details={"validationId": validation_id, "error": current.error},
                )

            return current

        def is_complete(result: GetValidationResponse) -> bool:
            return hasattr(result, "completed_at") and result.completed_at is not None

        result = poll_until(poll_fn, is_complete, options)
        return result.result
