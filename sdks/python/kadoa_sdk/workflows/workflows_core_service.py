"""Workflows core service for managing workflow lifecycle operations."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from urllib.parse import urlparse
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from kadoa_sdk.core.logger import workflow as logger
from kadoa_sdk.core.utils import PollingOptions, poll_until

if TYPE_CHECKING:  # pragma: no cover
    from kadoa_sdk.client import KadoaClient

from kadoa_sdk.core.exceptions import KadoaErrorCode, KadoaHttpError, KadoaSdkError
from kadoa_sdk.core.http import get_workflows_api
from kadoa_sdk.extraction.types import RunWorkflowOptions
from openapi_client.models.create_schema_body_fields_inner import CreateSchemaBodyFieldsInner
from openapi_client.models.location import Location
from openapi_client.models.monitoring_config import MonitoringConfig
from openapi_client.models.prompt_workflow import PromptWorkflow
from openapi_client.models.v4_workflows_workflow_id_run_put_request import (
    V4WorkflowsWorkflowIdRunPutRequest,
)
from openapi_client.models.workflow_from_template import WorkflowFromTemplate

from ..extraction.extraction_acl import (
    ClassificationField,
    CreateWorkflowBody,
    DataField,
    DataFieldExample,
    GetJobResponse,
    GetWorkflowResponse,
    ListWorkflowsRequest,
    RunWorkflowResponse,
    UpdateWorkflowRequest,
    UpdateWorkflowResponse,
    WorkflowListItemResponse,
    WorkflowsApi,
)


class CreateWorkflowInput(BaseModel):
    """Input for creating a workflow."""

    urls: List[str]
    name: Optional[str] = None
    description: Optional[str] = None
    schema_id: Optional[str] = Field(default=None, alias="schemaId")
    entity: Optional[str] = None
    fields: Optional[List[Any]] = None
    tags: Optional[List[str]] = None
    interval: Optional[str] = None
    monitoring: Optional[MonitoringConfig] = None
    location: Optional[Location] = None
    bypass_preview: Optional[bool] = Field(default=None, alias="bypassPreview")
    auto_start: Optional[bool] = Field(default=None, alias="autoStart")
    schedules: Optional[List[str]] = None
    additional_data: Optional[Dict[str, Any]] = Field(default=None, alias="additionalData")
    user_prompt: Optional[str] = Field(default=None, alias="userPrompt")
    template_id: Optional[UUID] = Field(default=None, alias="templateId")
    template_version: Optional[int] = Field(default=None, alias="templateVersion", ge=1)
    limit: Optional[int] = None

    model_config = ConfigDict(populate_by_name=True)


class CreateWorkflowResult(BaseModel):
    """Result of creating a workflow."""

    id: str


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
DEFAULT_AGENTIC_PROMPT = "extract all the data for the main entity of this page"


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

    def create(self, input: CreateWorkflowInput) -> CreateWorkflowResult:
        """
        Create a new workflow.

        Args:
            input: Workflow creation input with urls, userPrompt, fields, etc.

        Returns:
            CreateWorkflowResult with workflow id

        Raises:
            KadoaSdkError: If validation fails or no workflow ID returned
            KadoaHttpError: If creation fails
        """
        self._validate_additional_data(input.additional_data)

        domain_name = urlparse(input.urls[0]).hostname

        try:
            schema_fields = []
            for field in input.fields or []:
                if isinstance(field, CreateSchemaBodyFieldsInner):
                    schema_fields.append(field)
                elif isinstance(field, (DataField, ClassificationField)):
                    schema_fields.append(CreateSchemaBodyFieldsInner(actual_instance=field))
                else:
                    field_data = field.model_dump() if hasattr(field, "model_dump") else dict(field)
                    field_type = field_data.get("fieldType") or field_data.get("field_type")
                    field_model: DataField | ClassificationField
                    if field_type == "CLASSIFICATION":
                        field_model = ClassificationField(**field_data)
                    else:
                        example = field_data.pop("example", None)
                        if isinstance(example, (str, list)):
                            field_data["example"] = DataFieldExample(actual_instance=example)
                        elif example is not None:
                            field_data["example"] = example
                        field_model = DataField(**field_data)
                    schema_fields.append(CreateSchemaBodyFieldsInner(actual_instance=field_model))

            optional_fields = {
                "description": input.description,
                "schemaId": input.schema_id,
                "entity": input.entity,
                "fields": schema_fields or None,
                "tags": input.tags,
                "interval": input.interval,
                "monitoring": input.monitoring,
                "location": input.location,
                "schedules": input.schedules,
                "additionalData": input.additional_data,
                "limit": input.limit,
            }

            wrapper: CreateWorkflowBody

            if input.template_id is not None:
                conflicting = [
                    name
                    for name, value in {
                        "schemaId": input.schema_id,
                        "entity": input.entity,
                        "fields": input.fields,
                        "monitoring": input.monitoring,
                    }.items()
                    if value is not None
                ]
                if conflicting:
                    raise KadoaSdkError(
                        "Fields are defined by the template and cannot be supplied "
                        f"when creating from a template: {', '.join(conflicting)}",
                        code=KadoaErrorCode.VALIDATION_ERROR,
                        details={"conflicting": conflicting},
                    )

                request_data: Dict[str, Any] = {
                    "urls": input.urls,
                    "templateId": input.template_id,
                    **(
                        {"templateVersion": input.template_version}
                        if input.template_version is not None
                        else {}
                    ),
                    **(
                        {"userPrompt": input.user_prompt}
                        if input.user_prompt is not None
                        else {}
                    ),
                    **({"name": input.name} if input.name is not None else {}),
                    **(
                        {"description": input.description}
                        if input.description is not None
                        else {}
                    ),
                    **({"tags": input.tags} if input.tags is not None else {}),
                    **({"interval": input.interval} if input.interval is not None else {}),
                    **({"location": input.location} if input.location is not None else {}),
                    **({"schedules": input.schedules} if input.schedules is not None else {}),
                    **(
                        {"additionalData": input.additional_data}
                        if input.additional_data is not None
                        else {}
                    ),
                    **({"limit": input.limit} if input.limit is not None else {}),
                    **(
                        {"bypassPreview": input.bypass_preview}
                        if input.bypass_preview is not None
                        else {}
                    ),
                }
                wrapper = CreateWorkflowBody(
                    actual_instance=WorkflowFromTemplate.model_validate(request_data)
                )
            else:
                request_data = {
                    "urls": input.urls,
                    "name": input.name or domain_name,
                    "userPrompt": input.user_prompt or DEFAULT_AGENTIC_PROMPT,
                    "bypassPreview": (
                        input.bypass_preview if input.bypass_preview is not None else True
                    ),
                }
                request_data.update(
                    {key: value for key, value in optional_fields.items() if value is not None}
                )
                wrapper = CreateWorkflowBody(
                    actual_instance=PromptWorkflow.model_validate(request_data)
                )

            response = self.workflows_api.v4_workflows_post(create_workflow_body=wrapper)
            workflow_id = getattr(response, "workflow_id", None) or getattr(
                response, "workflowId", None
            )

            if not workflow_id:
                raise KadoaSdkError(
                    KadoaSdkError.ERROR_MESSAGES["NO_WORKFLOW_ID"],
                    code=KadoaErrorCode.INTERNAL_ERROR,
                    details={
                        "response": response.model_dump()
                        if hasattr(response, "model_dump")
                        else response
                    },
                )

            return CreateWorkflowResult(id=workflow_id)

        except KadoaSdkError:
            raise
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to create workflow",
                details={"urls": input.urls},
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
            response = self.workflows_api.v4_workflows_workflow_id_get_without_preload_content(
                workflow_id=workflow_id
            )
            try:
                raw = response.read()
                response_data = json.loads(raw) if raw else {}
            finally:
                response.release_conn()
            if response.status != 200:
                raise KadoaHttpError(
                    "Failed to get workflow",
                    http_status=response.status,
                    response_body=response_data,
                    code=KadoaHttpError.map_status_to_code(response.status),
                    details={"workflowId": workflow_id},
                )
            return GetWorkflowResponse.model_validate(response_data)
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

            response = self.workflows_api.v4_workflows_get_without_preload_content(**filter_dict)
            try:
                raw = response.read()
                response_data = json.loads(raw) if raw else {}
            finally:
                response.release_conn()
            if response.status != 200:
                raise KadoaHttpError(
                    "Failed to list workflows",
                    http_status=response.status,
                    response_body=response_data,
                    code=KadoaHttpError.map_status_to_code(response.status),
                    details={"filters": filter_dict},
                )
            workflows = response_data.get("workflows", [])
            if not workflows:
                return []
            from ..extraction.extraction_acl import WorkflowResponse

            return [WorkflowResponse.model_validate(workflow) for workflow in workflows]
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to list workflows",
                details={"filters": filter_dict if "filter_dict" in locals() else {}},
            )

    def get_audit_log(
        self,
        workflow_id: str,
        page: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> Any:
        """Get the configuration revision history (audit log) for a workflow.

        Each entry captures who changed the workflow, when, from which channel
        (UI/API/SDK/MCP/CLI/SYSTEM), and full before/after snapshots for UPDATE
        operations. CREATE entries have null ``previous_value``/``new_value``.

        Args:
            workflow_id: Workflow ID.
            page: Page number for pagination.
            limit: Items per page.

        Returns:
            Audit log response object with ``entries`` and ``pagination``.

        Raises:
            KadoaHttpError: If the API request fails.
        """
        try:
            return self.workflows_api.v5_workflows_workflow_id_auditlog_get(
                workflow_id=workflow_id,
                page=page,
                limit=limit,
            )
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to get workflow audit log",
                details={"workflowId": workflow_id},
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

    def pause(self, workflow_id: str) -> None:
        """
        Pause an active workflow.

        Args:
            workflow_id: Workflow ID

        Raises:
            KadoaHttpError: If pause fails
        """
        try:
            self.workflows_api.v4_workflows_workflow_id_pause_put(workflow_id=workflow_id)
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to pause workflow",
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
            poll_interval_ms: Polling interval in milliseconds (default: 10000)
            timeout_ms: Timeout in milliseconds (default: 300000)

        Returns:
            GetWorkflowResponse: Workflow response when terminal state is reached

        Raises:
            KadoaSdkError: If timeout occurs
        """
        options = PollingOptions(poll_interval_ms=poll_interval_ms, timeout_ms=timeout_ms)

        def poll_fn() -> GetWorkflowResponse:
            current = self.get(workflow_id)

            debug(
                "workflow %s state: %s",
                workflow_id,
                getattr(current, "run_state", None),
            )

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
            poll_interval_ms: Polling interval in milliseconds (default: 10000)
            timeout_ms: Timeout in milliseconds (default: 300000)

        Returns:
            GetJobResponse: Job response when terminal state is reached

        Raises:
            KadoaSdkError: If timeout occurs
        """
        options = PollingOptions(poll_interval_ms=poll_interval_ms, timeout_ms=timeout_ms)

        def poll_fn() -> GetJobResponse:
            current = self.get_job_status(workflow_id, job_id)

            debug("workflow run %s state: %s", job_id, getattr(current, "state", None))

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
