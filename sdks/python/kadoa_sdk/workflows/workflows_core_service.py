"""Workflows core service for managing workflow lifecycle operations."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from kadoa_sdk.core.logger import workflow as logger
from kadoa_sdk.core.utils import PollingOptions, poll_until

if TYPE_CHECKING:  # pragma: no cover
    from kadoa_sdk.client import KadoaClient

from kadoa_sdk.core.exceptions import KadoaErrorCode, KadoaHttpError, KadoaSdkError
from kadoa_sdk.core.http import get_workflows_api
from kadoa_sdk.extraction.types import RunWorkflowOptions
from openapi_client.models.v4_workflows_workflow_id_run_put_request import (
    V4WorkflowsWorkflowIdRunPutRequest,
)

from ..extraction.extraction_acl import (
    GetJobResponse,
    GetWorkflowResponse,
    ListWorkflowsRequest,
    RunWorkflowResponse,
    UpdateWorkflowRequest,
    UpdateWorkflowResponse,
    WorkflowListItemResponse,
    WorkflowsApi,
)

TERMINAL_JOB_STATES = {
    "FINISHED",
    "FAILED",
    "NOT_SUPPORTED",
    "FAILED_INSUFFICIENT_FUNDS",
}

TERMINAL_RUN_STATES = {
    "FINISHED",
    "SUCCESS",
    "FAILED",
    "ERROR",
    "STOPPED",
    "CANCELLED",
}

debug = logger.debug


class WorkflowsCoreService:
    """Service for managing workflow lifecycle operations"""

    def __init__(self, client: "KadoaClient") -> None:
        """
        Args:
            client: KadoaClient instance
        """
        self.client = client
        self._workflows_api: Optional[WorkflowsApi] = None

    @property
    def workflows_api(self) -> WorkflowsApi:
        """Lazy-load workflows API"""
        if self._workflows_api is None:
            self._workflows_api = get_workflows_api(self.client)
        return self._workflows_api

    def _validate_additional_data(self, additional_data: Optional[Dict[str, Any]]) -> None:
        """Validate additional_data field"""
        if additional_data is None:
            return

        if not isinstance(additional_data, dict):
            raise KadoaSdkError(
                "additional_data must be a dictionary", code=KadoaErrorCode.VALIDATION_ERROR
            )

        try:
            serialized = json.dumps(additional_data)
            if len(serialized) > 100 * 1024:
                debug("[Kadoa SDK] additional_data exceeds 100KB, consider reducing size")
        except (TypeError, ValueError):
            raise KadoaSdkError(
                "additional_data must be JSON-serializable", code=KadoaErrorCode.VALIDATION_ERROR
            )

    def get(self, workflow_id: str) -> GetWorkflowResponse:
        """
        Get workflow details by ID.

        Args:
            workflow_id: Workflow ID

        Returns:
            GetWorkflowResponse: Workflow response with details

        Raises:
            KadoaHttpError: If workflow not found or request fails
        """
        try:
            response = self.workflows_api.v4_workflows_workflow_id_get(workflow_id=workflow_id)
            return GetWorkflowResponse.from_generated(response)
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to get workflow",
                details={"workflowId": workflow_id},
            )

    def list(
        self,
        filters: Optional[ListWorkflowsRequest] = None,
    ) -> List[WorkflowListItemResponse]:
        """
        List workflows with optional filtering.

        Args:
            filters: Optional filters for listing workflows

        Returns:
            List of workflow responses

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            filter_dict: Dict[str, Any] = {}
            if filters is not None:
                filter_dict = filters.model_dump(exclude_none=True, by_alias=True)

            response = self.workflows_api.v4_workflows_get(**filter_dict)
            # The API returns a response object with .data attribute containing V4WorkflowsGet200Response
            response_data = response.data if hasattr(response, "data") else response
            workflows = getattr(response_data, "workflows", None) or []
            if not workflows:
                return []
            # Convert to WorkflowResponse with enum remapping
            from ..extraction.extraction_acl import WorkflowResponse
            return [WorkflowResponse.from_generated(wf) for wf in workflows]
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to list workflows",
                details={"filters": filter_dict if "filter_dict" in locals() else {}},
            )

    def get_by_name(self, name: str) -> Optional[WorkflowListItemResponse]:
        """
        Get workflow by name.

        Args:
            name: Workflow name to search for

        Returns:
            Workflow response if found, None otherwise

        Raises:
            KadoaHttpError: If request fails
        """
        workflows = self.list(filters=ListWorkflowsRequest(search=name))
        return workflows[0] if workflows else None

    def update(
        self,
        workflow_id: str,
        input: UpdateWorkflowRequest,
    ) -> UpdateWorkflowResponse:
        """
        Update workflow metadata.

        Args:
            workflow_id: Workflow ID
            input: Update workflow request with metadata fields

        Returns:
            Update workflow response with success and message fields

        Raises:
            KadoaSdkError: If business logic validation fails
            KadoaHttpError: If update fails
        """
        additional_data = getattr(input, "additional_data", None) or getattr(
            input, "additionalData", None
        )
        self._validate_additional_data(additional_data)

        try:
            response = self.workflows_api.v4_workflows_workflow_id_metadata_put(
                workflow_id=workflow_id,
                v4_workflows_workflow_id_metadata_put_request=input,
            )
            return response
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to update workflow",
                details={"workflowId": workflow_id},
            )

    def delete(self, workflow_id: str) -> None:
        """
        Delete a workflow by ID.

        Args:
            workflow_id: Workflow ID

        Raises:
            KadoaHttpError: If deletion fails
        """
        try:
            self.workflows_api.v4_workflows_workflow_id_delete(workflow_id=workflow_id)
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to delete workflow",
                details={"workflowId": workflow_id},
            )

    def resume(self, workflow_id: str) -> None:
        """
        Resume a paused workflow.

        Args:
            workflow_id: Workflow ID

        Raises:
            KadoaHttpError: If resume fails
        """
        try:
            self.workflows_api.v4_workflows_workflow_id_resume_put(workflow_id=workflow_id)
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to resume workflow",
                details={"workflowId": workflow_id},
            )

    def run_workflow(
        self,
        workflow_id: str,
        input: Optional[RunWorkflowOptions] = None,
    ) -> RunWorkflowResponse:
        """
        Run a workflow (create a job).

        Args:
            workflow_id: Workflow ID
            input: Optional run workflow options (variables, limit)

        Returns:
            RunWorkflowResponse: Response with jobId and status

        Raises:
            KadoaSdkError: If no job ID is returned
            KadoaHttpError: If run fails
        """
        run_request = V4WorkflowsWorkflowIdRunPutRequest()
        if input is not None:
            if input.variables is not None:
                run_request.variables = input.variables
            if input.limit is not None:
                run_request.limit = input.limit

        try:
            response = self.workflows_api.v4_workflows_workflow_id_run_put(
                workflow_id=workflow_id,
                v4_workflows_workflow_id_run_put_request=run_request,
            )
            return response
        except Exception as error:
            if isinstance(error, KadoaSdkError):
                raise
            raise KadoaHttpError.wrap(
                error,
                message="Failed to run workflow",
                details={"workflowId": workflow_id},
            )

    def get_job_status(self, workflow_id: str, job_id: str) -> GetJobResponse:
        """
        Get job status directly without polling workflow details.

        Args:
            workflow_id: Workflow ID
            job_id: Job ID

        Returns:
            GetJobResponse: Job response with status

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.workflows_api.v4_workflows_workflow_id_jobs_job_id_get(
                workflow_id=workflow_id, job_id=job_id
            )
            job_data = response.data if hasattr(response, "data") else response
            return GetJobResponse.from_generated(job_data)
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to get job status",
                details={"workflowId": workflow_id, "jobId": job_id},
            )

    def wait(
        self,
        workflow_id: str,
        target_state: Optional[str] = None,
        poll_interval_ms: Optional[int] = None,
        timeout_ms: Optional[int] = None,
    ) -> GetWorkflowResponse:
        """
        Wait for a workflow to reach the target state or a terminal state.

        Args:
            workflow_id: Workflow ID
            target_state: Target state to wait for (optional)
            poll_interval_ms: Polling interval in milliseconds (default: 1000)
            timeout_ms: Timeout in milliseconds (default: 300000)

        Returns:
            GetWorkflowResponse: Workflow response when terminal state is reached

        Raises:
            KadoaSdkError: If timeout occurs
        """
        options = PollingOptions(poll_interval_ms=poll_interval_ms, timeout_ms=timeout_ms)

        last: Optional[GetWorkflowResponse] = None

        def poll_fn() -> GetWorkflowResponse:
            nonlocal last
            current = self.get(workflow_id)

            if last is not None and (
                getattr(last, "state", None) != getattr(current, "state", None)
                or getattr(last, "run_state", None) != getattr(current, "run_state", None)
            ):
                debug(
                    "workflow %s state: [workflowState: %s, jobState: %s]",
                    workflow_id,
                    getattr(current, "state", None),
                    getattr(current, "run_state", None),
                )

            last = current
            return current

        def is_complete(current: GetWorkflowResponse) -> bool:
            if target_state and getattr(current, "state", None) == target_state:
                return True

            run_state = getattr(current, "run_state", None)
            if (
                run_state
                and run_state.upper() in TERMINAL_RUN_STATES
                and getattr(current, "state", None) != "QUEUED"
            ):
                return True

            return False

        result = poll_until(poll_fn, is_complete, options)
        return result.result

    def wait_for_job_completion(
        self,
        workflow_id: str,
        job_id: str,
        target_status: Optional[str] = None,
        poll_interval_ms: Optional[int] = None,
        timeout_ms: Optional[int] = None,
    ) -> GetJobResponse:
        """
        Wait for a job to reach the target status or a terminal state.

        Args:
            workflow_id: Workflow ID
            job_id: Job ID
            target_status: Target status to wait for (optional)
            poll_interval_ms: Polling interval in milliseconds (default: 1000)
            timeout_ms: Timeout in milliseconds (default: 300000)

        Returns:
            GetJobResponse: Job response when terminal state is reached

        Raises:
            KadoaSdkError: If timeout occurs
        """
        options = PollingOptions(poll_interval_ms=poll_interval_ms, timeout_ms=timeout_ms)

        last: Optional[GetJobResponse] = None

        def poll_fn() -> GetJobResponse:
            nonlocal last
            current = self.get_job_status(workflow_id, job_id)

            current_state = getattr(current, "state", None)
            if last is not None:
                last_state = getattr(last, "state", None)
                if last_state != current_state:
                    debug("job %s state: %s", job_id, current_state)

            last = current
            return current

        def is_complete(current: GetJobResponse) -> bool:
            current_state = getattr(current, "state", None)
            if target_status and current_state == target_status:
                return True

            if current_state and current_state.upper() in TERMINAL_JOB_STATES:
                return True

            return False

        result = poll_until(poll_fn, is_complete, options)
        return result.result
