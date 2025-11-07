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
from openapi_client.models.v4_workflows_workflow_id_metadata_put200_response import (
    V4WorkflowsWorkflowIdMetadataPut200Response,
)

from ..extraction.extraction_acl import (
    V4WorkflowsWorkflowIdGet200Response,
    WorkflowsApi,
)

# Terminal job states
TERMINAL_JOB_STATES = {
    "FINISHED",
    "FAILED",
    "NOT_SUPPORTED",
    "FAILED_INSUFFICIENT_FUNDS",
}

# Terminal run states
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

    def get(self, workflow_id: str) -> V4WorkflowsWorkflowIdGet200Response:
        """
        Get workflow details by ID.

        Args:
            workflow_id: Workflow ID

        Returns:
            Workflow response with details

        Raises:
            KadoaHttpError: If workflow not found or request fails
        """
        try:
            response = self.workflows_api.v4_workflows_workflow_id_get(workflow_id=workflow_id)
            return response
        except Exception as error:
            # Handle case where API returns entity as string instead of dict
            # Check if this is a ValidationError about entity field
            import json

            from pydantic import ValidationError

            from ..core.core_acl import RESTClientObject

            validation_error = None
            if isinstance(error, ValidationError):
                validation_error = error
            elif hasattr(error, "__cause__") and isinstance(error.__cause__, ValidationError):
                validation_error = error.__cause__
            elif hasattr(error, "cause") and isinstance(error.cause, ValidationError):
                validation_error = error.cause

            if validation_error:
                # Check if error is about entity field expecting dict but getting string
                # or displayState having invalid enum value (e.g., 'DELETED')
                entity_error = any(
                    err.get("type") == "dict_type"
                    and any("entity" in str(loc) for loc in err.get("loc", []))
                    for err in validation_error.errors()
                )
                display_state_error = any(
                    err.get("type") == "value_error"
                    and any(
                        "displayState" in str(loc) or "display_state" in str(loc)
                        for loc in err.get("loc", [])
                    )
                    for err in validation_error.errors()
                )
                if entity_error or display_state_error:
                    # Fetch raw response and normalize fields
                    url = f"{self.client.base_url}/v4/workflows/{workflow_id}"
                    headers = {}
                    config = self.client.configuration
                    api_key = getattr(config, "api_key", None)
                    if isinstance(api_key, dict):
                        key = api_key.get("ApiKeyAuth")
                        if key:
                            headers["x-api-key"] = key
                    rest = RESTClientObject(self.client.configuration)
                    try:
                        response = rest.request("GET", url, headers=headers)
                        response_data = response.read()
                        data = json.loads(response_data)
                        # Normalize entity field: convert string to None
                        # Model expects dict or None, but API returns string
                        if "entity" in data and isinstance(data["entity"], str):
                            data["entity"] = None
                        # Normalize displayState: if it's DELETED and not in enum, set to None or a valid value
                        if "displayState" in data and data["displayState"] == "DELETED":
                            # Keep DELETED as-is, but we need to handle validation differently
                            # For now, we'll try to create the model with DELETED state
                            pass
                        return V4WorkflowsWorkflowIdGet200Response.from_dict(data)
                    except Exception as fallback_error:
                        # If normalization still fails, try with displayState removed
                        if "displayState" in data:
                            original_display_state = data.pop("displayState")
                            try:
                                return V4WorkflowsWorkflowIdGet200Response.from_dict(data)
                            except Exception:
                                # Restore and raise original error
                                data["displayState"] = original_display_state
                                raise fallback_error
                        raise fallback_error
                    finally:
                        pass  # RESTClientObject doesn't have a close method

            raise KadoaHttpError.wrap(
                error,
                message="Failed to get workflow",
                details={"workflowId": workflow_id},
            )

    def list(
        self,
        search: Optional[str] = None,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
        state: Optional[str] = None,
        tags: Optional[List[str]] = None,
        monitoring: Optional[str] = None,
        update_interval: Optional[str] = None,
        template_id: Optional[str] = None,
        include_deleted: Optional[str] = None,
        format: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        List workflows with optional filtering.

        Args:
            search: Search term for workflow name
            skip: Number of workflows to skip
            limit: Maximum number of workflows to return
            state: Filter by workflow state
            tags: Filter by tags
            monitoring: Filter by monitoring status
            update_interval: Filter by update interval
            template_id: Filter by template ID
            include_deleted: Include deleted workflows
            format: Response format (json/csv)

        Returns:
            List of workflow responses

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            filters: Dict[str, Any] = {}
            if search is not None:
                filters["search"] = search
            if skip is not None:
                filters["skip"] = skip
            if limit is not None:
                filters["limit"] = limit
            if state is not None:
                filters["state"] = state
            if tags is not None:
                filters["tags"] = tags
            if monitoring is not None:
                filters["monitoring"] = monitoring
            if update_interval is not None:
                filters["update_interval"] = update_interval
            if template_id is not None:
                filters["template_id"] = template_id
            if include_deleted is not None:
                filters["include_deleted"] = include_deleted
            if format is not None:
                filters["format"] = format

            response = self.workflows_api.v4_workflows_get(**filters)
            # The API returns a response object with .data attribute containing V4WorkflowsGet200Response
            response_data = response.data if hasattr(response, "data") else response
            workflows = getattr(response_data, "workflows", None) or []
            return workflows if workflows else []
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to list workflows",
                details={"filters": filters if "filters" in locals() else {}},
            )

    def get_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Get workflow by name.

        Args:
            name: Workflow name to search for

        Returns:
            Workflow response if found, None otherwise

        Raises:
            KadoaHttpError: If request fails
        """
        workflows = self.list(search=name)
        return workflows[0] if workflows else None

    def update(
        self,
        workflow_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        limit: Optional[int] = None,
        tags: Optional[List[str]] = None,
        interval: Optional[str] = None,
        schedules: Optional[List[str]] = None,
        monitoring: Optional[Dict[str, Any]] = None,
        schema_id: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None,
    ) -> V4WorkflowsWorkflowIdMetadataPut200Response:
        """
        Update workflow metadata.

        Args:
            workflow_id: Workflow ID
            name: Workflow name
            description: Workflow description
            limit: Maximum records limit
            tags: Workflow tags
            interval: Update interval
            schedules: Schedule configurations
            monitoring: Monitoring configuration
            schema_id: Schema ID
            additional_data: Additional data (must be JSON-serializable, max 100KB)

        Returns:
            Update workflow response with success and message fields

        Raises:
            KadoaSdkError: If validation fails
            KadoaHttpError: If update fails
        """
        self._validate_additional_data(additional_data)

        update_request: Dict[str, Any] = {}
        if name is not None:
            update_request["name"] = name
        if description is not None:
            update_request["description"] = description
        if limit is not None:
            update_request["limit"] = limit
        if tags is not None:
            update_request["tags"] = tags
        if interval is not None:
            update_request["interval"] = interval
        if schedules is not None:
            update_request["schedules"] = schedules
        if monitoring is not None:
            update_request["monitoring"] = monitoring
        if schema_id is not None:
            update_request["schema_id"] = schema_id
        if additional_data is not None:
            update_request["additional_data"] = additional_data

        try:
            response = self.workflows_api.v4_workflows_workflow_id_metadata_put(
                workflow_id=workflow_id,
                v4_workflows_workflow_id_metadata_put_request=update_request,
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
        variables: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Run a workflow (create a job).

        Args:
            workflow_id: Workflow ID
            variables: Variables to pass to the workflow
            limit: Maximum records limit for this run

        Returns:
            Response with jobId and status

        Raises:
            KadoaSdkError: If no job ID is returned
            KadoaHttpError: If run fails
        """
        run_request: Dict[str, Any] = {}
        if variables is not None:
            run_request["variables"] = variables
        if limit is not None:
            run_request["limit"] = limit

        try:
            response = self.workflows_api.v4_workflows_workflow_id_run_put(
                workflow_id=workflow_id,
                v4_workflows_workflow_id_run_put_request=run_request,
            )
            job_id = getattr(response, "job_id", None) or getattr(response, "jobId", None)
            if not job_id:
                raise KadoaSdkError(
                    KadoaSdkError.ERROR_MESSAGES["NO_WORKFLOW_ID"],
                    code=KadoaErrorCode.INTERNAL_ERROR,
                    details={
                        "response": response.model_dump()
                        if hasattr(response, "model_dump")
                        else response
                    },
                )
            return {
                "job_id": job_id,
                "message": getattr(response, "message", None),
                "status": getattr(response, "status", None),
            }
        except Exception as error:
            if isinstance(error, KadoaSdkError):
                raise
            raise KadoaHttpError.wrap(
                error,
                message="Failed to run workflow",
                details={"workflowId": workflow_id},
            )

    def get_job_status(self, workflow_id: str, job_id: str) -> Dict[str, Any]:
        """
        Get job status directly without polling workflow details.

        Args:
            workflow_id: Workflow ID
            job_id: Job ID

        Returns:
            Job response with status

        Raises:
            KadoaHttpError: If request fails
        """
        try:
            response = self.workflows_api.v4_workflows_workflow_id_jobs_job_id_get(
                workflow_id=workflow_id, job_id=job_id
            )
            return (
                response.data.model_dump()
                if hasattr(response.data, "model_dump")
                else response.data
            )
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
    ) -> V4WorkflowsWorkflowIdGet200Response:
        """
        Wait for a workflow to reach the target state or a terminal state.

        Args:
            workflow_id: Workflow ID
            target_state: Target state to wait for (optional)
            poll_interval_ms: Polling interval in milliseconds (default: 1000)
            timeout_ms: Timeout in milliseconds (default: 300000)

        Returns:
            Workflow response when terminal state is reached

        Raises:
            KadoaSdkError: If timeout occurs
        """
        options = PollingOptions(poll_interval_ms=poll_interval_ms, timeout_ms=timeout_ms)

        last: Optional[V4WorkflowsWorkflowIdGet200Response] = None

        def poll_fn() -> V4WorkflowsWorkflowIdGet200Response:
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

        def is_complete(current: V4WorkflowsWorkflowIdGet200Response) -> bool:
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
    ) -> Dict[str, Any]:
        """
        Wait for a job to reach the target status or a terminal state.

        Args:
            workflow_id: Workflow ID
            job_id: Job ID
            target_status: Target status to wait for (optional)
            poll_interval_ms: Polling interval in milliseconds (default: 1000)
            timeout_ms: Timeout in milliseconds (default: 300000)

        Returns:
            Job response when terminal state is reached

        Raises:
            KadoaSdkError: If timeout occurs
        """
        options = PollingOptions(poll_interval_ms=poll_interval_ms, timeout_ms=timeout_ms)

        last: Optional[Dict[str, Any]] = None

        def poll_fn() -> Dict[str, Any]:
            nonlocal last
            current = self.get_job_status(workflow_id, job_id)

            current_state = (
                current.get("state")
                if isinstance(current, dict)
                else getattr(current, "state", None)
            )
            if last is not None:
                last_state = (
                    last.get("state") if isinstance(last, dict) else getattr(last, "state", None)
                )
                if last_state != current_state:
                    debug("job %s state: %s", job_id, current_state)

            last = current
            return current

        def is_complete(current: Dict[str, Any]) -> bool:
            current_state = (
                current.get("state")
                if isinstance(current, dict)
                else getattr(current, "state", None)
            )
            if target_status and current_state == target_status:
                return True

            if current_state and current_state.upper() in TERMINAL_JOB_STATES:
                return True

            return False

        result = poll_until(poll_fn, is_complete, options)
        return result.result
