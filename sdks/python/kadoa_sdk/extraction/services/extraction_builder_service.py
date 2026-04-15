from __future__ import annotations

from collections.abc import AsyncGenerator
import time
from typing import TYPE_CHECKING, Any, Dict, List, Optional, TypedDict, Union

from ..extraction_acl import (
    ClassificationField,
    CreateWorkflowBody,
    DataField,
    DataFieldExample,
    SchemaResponseSchemaInner,
    V4WorkflowsWorkflowIdGet200Response,
)
from openapi_client.models.agentic_workflow import AgenticWorkflow

if TYPE_CHECKING:  # pragma: no cover
    from ...client import KadoaClient
from ...core.exceptions import KadoaErrorCode, KadoaHttpError, KadoaSdkError
from ...core.http import get_workflows_api
from ...core.utils import PollingOptions, poll_until
from ...notifications import NotificationOptions
from ...schemas.schema_builder import SchemaBuilder
from ..types import (
    EntityConfig,
    ExtractOptions,
    ExtractOptionsInternal,
    FetchDataOptions,
    FetchDataResult,
    LocationConfig,
    RunWorkflowOptions,
    WaitForReadyOptions,
    WorkflowInterval,
    WorkflowMonitoringConfig,
)
from .data_fetcher_service import DataFetcherService

DEFAULT_AGENTIC_PROMPT = "extract all the data for the main entity of this page"
BUILD_NOT_READY_ERROR = "No completed build. Build the project first."
TERMINAL_RUN_STATES = {
    "FINISHED",
    "SUCCESS",
    "FAILED",
    "ERROR",
    "STOPPED",
    "CANCELLED",
}


def _build_agentic_prompt(
    *, entity: Optional[str], fields: List[Dict[str, Any]], user_prompt: Optional[str]
) -> str:
    if user_prompt:
        return user_prompt

    field_names = [
        field.get("name")
        for field in fields
        if isinstance(field, dict) and isinstance(field.get("name"), str)
    ]

    if not field_names:
        return DEFAULT_AGENTIC_PROMPT

    field_list = ", ".join(field_names)
    if entity:
        return f"extract all {entity} entities from this page and return these fields: {field_list}"

    return f"extract all records from this page and return these fields: {field_list}"


class RunWorkflowRequest(TypedDict, total=False):
    """Request body for running a workflow"""

    variables: Dict[str, Any]  # User-defined variables
    limit: int


class IntervalOptions(TypedDict):
    """Options for setting workflow interval"""

    interval: WorkflowInterval


class SchedulesOptions(TypedDict):
    """Options for setting workflow schedules"""

    schedules: List[str]


class PreparedExtraction:
    """Prepared extraction that can be configured before creation.

    Provides a fluent API for configuring extraction options before creating
    the workflow. Supports method chaining for convenient configuration.

    Example:
        ```python
        extraction = client.extract(
            ExtractOptions(
                urls=["https://example.com"],
                name="My Extraction"
            )
        ).with_notifications(...).set_interval(...).create()
        ```
    """

    def __init__(
        self,
        builder: "ExtractionBuilderService",
        options: ExtractOptionsInternal,
    ) -> None:
        self._builder = builder
        self._options = options

    @property
    def options(self) -> ExtractOptionsInternal:
        return self._options

    def with_notifications(self, options: NotificationOptions) -> "PreparedExtraction":
        """Configure notifications for this extraction.

        Sets up notification channels and events that will be triggered
        when the workflow runs.

        Args:
            options: Notification options including:
                - workflow_id: Optional workflow ID (auto-set on creation)
                - events: List of event types or "all"
                - channels: Channel configuration dictionary

        Returns:
            PreparedExtraction: Self for method chaining

        Example:
            ```python
            from kadoa_sdk.notifications import NotificationOptions

            extraction.with_notifications(
                NotificationOptions(
                    events=["workflow_finished", "workflow_failed"],
                    channels={"email": True}
                )
            )
            ```
        """
        self._builder._notification_options = options
        return self

    def with_monitoring(self, options: WorkflowMonitoringConfig) -> "PreparedExtraction":
        """Configure workflow monitoring.

        Sets monitoring configuration for the workflow.

        Args:
            options: Monitoring configuration dictionary

        Returns:
            PreparedExtraction: Self for method chaining
        """
        self._builder._monitoring_options = options
        return self

    def set_interval(
        self,
        options: Union[IntervalOptions, SchedulesOptions],
    ) -> "PreparedExtraction":
        """Set workflow interval or schedules.

        Configures how often the workflow should run. Can set a simple interval
        or custom schedules.

        Args:
            options: Either:
                - IntervalOptions: {"interval": WorkflowInterval}
                - SchedulesOptions: {"schedules": List[str]}

        Returns:
            PreparedExtraction: Self for method chaining

        Example:
            ```python
            # Set hourly interval
            extraction.set_interval({"interval": "HOURLY"})

            # Set custom schedules
            extraction.set_interval({
                "schedules": ["0 9 * * *", "0 17 * * *"]  # 9 AM and 5 PM daily
            })
            ```
        """
        if "interval" in options:
            self._options.interval = options["interval"]
        elif "schedules" in options:
            self._options.interval = "CUSTOM"
            self._options.schedules = options["schedules"]
        return self

    def bypass_preview(self) -> "PreparedExtraction":
        """Skip preview mode"""
        self._options.bypass_preview = True
        return self

    def set_location(self, options: LocationConfig) -> "PreparedExtraction":
        """Set location configuration"""
        self._options.location = options
        return self

    def with_prompt(self, prompt: str) -> "PreparedExtraction":
        """Set user prompt for this extraction"""
        self._builder._user_prompt = prompt
        self._options.user_prompt = prompt
        return self

    def create(self) -> "CreatedExtraction":
        """Create the workflow"""
        return self._builder._create(self._options)


class CreatedExtraction:
    """Created extraction that can be run or submitted"""

    def __init__(
        self,
        builder: "ExtractionBuilderService",
        workflow_id: str,
        options: ExtractOptionsInternal,
    ) -> None:
        self._builder = builder
        self._workflow_id = workflow_id
        self._options = options

    @property
    def workflow_id(self) -> str:
        return self._workflow_id

    @property
    def options(self) -> ExtractOptionsInternal:
        return self._options

    def wait_for_ready(
        self, options: Optional[WaitForReadyOptions] = None
    ) -> V4WorkflowsWorkflowIdGet200Response:
        """Wait for workflow to be ready"""
        return self._builder._wait_for_ready(self._workflow_id, options)

    def run(self, options: Optional[RunWorkflowOptions] = None) -> "FinishedExtraction":
        """Run workflow and wait for completion"""
        return self._builder._run(self._workflow_id, self._options, options)

    def submit(self, options: Optional[RunWorkflowOptions] = None) -> "SubmittedExtraction":
        """Submit workflow without waiting"""
        return self._builder._submit(self._workflow_id, self._options, options)


class FinishedExtraction:
    """Finished extraction that can fetch data"""

    def __init__(
        self,
        builder: "ExtractionBuilderService",
        workflow_id: str,
        job_id: str,
    ) -> None:
        self._builder = builder
        self._workflow_id = workflow_id
        self._job_id = job_id

    @property
    def job_id(self) -> str:
        return self._job_id

    @property
    def workflow_id(self) -> str:
        return self._workflow_id

    def fetch_data(
        self,
        options: Optional[Dict[str, Any]] = None,
    ) -> FetchDataResult:
        """Fetch data with pagination"""
        fetch_options = FetchDataOptions(
            workflow_id=self._workflow_id,
            run_id=self._job_id,
            **(options or {}),
        )
        return self._builder._fetch_data(fetch_options)

    def fetch_all_data(
        self,
        options: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch all data (auto-pagination)"""
        fetch_options = FetchDataOptions(
            workflow_id=self._workflow_id,
            run_id=self._job_id,
            **(options or {}),
        )
        return self._builder._fetch_all_data(fetch_options)

    async def fetch_data_pages(
        self,
        options: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[FetchDataResult, None]:
        """Fetch data pages as async generator"""
        fetch_options = FetchDataOptions(
            workflow_id=self._workflow_id,
            run_id=self._job_id,
            **(options or {}),
        )
        async for page in self._builder._data_fetcher.fetch_data_pages(fetch_options):
            yield page


class SubmittedExtraction:
    """Submitted extraction result"""

    def __init__(self, workflow_id: str, job_id: str) -> None:
        self.workflow_id = workflow_id
        self.job_id = job_id


class ExtractionBuilderService:
    """Service for building extractions with fluent API"""

    def __init__(self, client: "KadoaClient") -> None:
        self.client = client
        self._data_fetcher = DataFetcherService(client)
        self._notification_options: Optional[NotificationOptions] = None
        self._monitoring_options: Optional[WorkflowMonitoringConfig] = None
        self._user_prompt: Optional[str] = None

    def _get_workflow_status(self, workflow_id: str) -> V4WorkflowsWorkflowIdGet200Response:
        """Get workflow status"""
        api = get_workflows_api(self.client)
        try:
            resp = api.v4_workflows_workflow_id_get(workflow_id=workflow_id)
            return resp.data if hasattr(resp, "data") else resp
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message=KadoaSdkError.ERROR_MESSAGES.get(
                    "PROGRESS_CHECK_FAILED", "Failed to get workflow status"
                ),
                details={"workflowId": workflow_id},
            )

    def extract(self, options: ExtractOptions) -> PreparedExtraction:
        """Create a prepared extraction with fluent API.

        Creates a PreparedExtraction instance that can be configured with
        notifications, monitoring, intervals, and other options before
        creating the workflow.

        Args:
            options: Extraction options including:
                - urls: List of URLs to extract from
                - name: Extraction name
                - description: Optional description
                - extraction: Optional schema builder callback
                - additional_data: Optional additional metadata
                - bypass_preview: Whether to skip preview mode

        Returns:
            PreparedExtraction: Prepared extraction ready for configuration

        Example:
            ```python
            from kadoa_sdk.extraction.types import ExtractOptions
            from kadoa_sdk.schemas.schema_builder import SchemaBuilder

            extraction = builder.extract(
                ExtractOptions(
                    urls=["https://example.com/products"],
                    name="Product Extraction",
                    extraction=lambda schema: (
                        schema.entity("Product")
                        .field("title", "Product title", "STRING")
                        .field("price", "Product price", "MONEY", example="$99.99")
                    )
                )
            ).create()
            ```
        """
        entity: EntityConfig = "ai-detection"
        built_fields: List[Dict[str, Any]] = []

        if options.extraction:
            result = options.extraction(SchemaBuilder())

            if isinstance(result, dict) and "schemaId" in result:
                entity = {"schemaId": result["schemaId"]}
            else:
                built_schema = result.build()
                built_fields = built_schema["fields"]
                if built_schema.get("entityName"):
                    entity = {
                        "name": built_schema["entityName"],
                        "fields": built_fields,
                    }
                else:
                    entity = {"fields": built_fields}

        self._user_prompt = options.user_prompt

        internal_options = ExtractOptionsInternal(
            urls=options.urls,
            name=options.name,
            description=options.description,
            entity=entity,
            bypass_preview=options.bypass_preview or False,
            additional_data=options.additional_data,
            user_prompt=options.user_prompt,
        )

        return PreparedExtraction(self, internal_options)

    def _create(self, options: ExtractOptionsInternal) -> CreatedExtraction:
        """Create workflow"""
        urls = options.urls
        name = options.name
        description = options.description
        entity = options.entity
        user_prompt = options.user_prompt or self._user_prompt

        raw_fields = (
            entity.get("fields")
            if isinstance(entity, dict) and isinstance(entity.get("fields"), list)
            else []
        )
        converted_fields = []
        for field in raw_fields:
            if hasattr(field, "model_dump"):
                converted_fields.append(field.model_dump())
            elif isinstance(field, dict):
                converted_fields.append(field)
            else:
                converted_fields.append(dict(field) if hasattr(field, "__dict__") else field)

        resolved_entity_name = entity.get("name") if isinstance(entity, dict) else None
        user_prompt = _build_agentic_prompt(
            entity=resolved_entity_name,
            fields=converted_fields,
            user_prompt=user_prompt,
        )
        self._user_prompt = user_prompt

        fields_list = []
        for field in converted_fields:
            if hasattr(field, "model_dump"):
                fields_list.append(field.model_dump())
            elif isinstance(field, dict):
                fields_list.append(field)
            else:
                fields_list.append(dict(field) if hasattr(field, "__dict__") else field)

        workflow_id = self._create_workflow(
            urls=urls,
            name=name,
            description=description,
            entity=resolved_entity_name,
            fields=fields_list,
            schema_id=(
                entity.get("schemaId")
                if isinstance(entity, dict) and "schemaId" in entity
                else None
            ),
            monitoring=self._monitoring_options,
            interval=options.interval,
            schedules=options.schedules,
            location=options.location,
            bypass_preview=options.bypass_preview,
            additional_data=options.additional_data,
            user_prompt=user_prompt,
        )

        if self._notification_options:
            notification_options = NotificationOptions(
                workflow_id=workflow_id,
                events=self._notification_options.events,
                channels=self._notification_options.channels,
            )
            self.client.notification.setup.setup(notification_options)

        return CreatedExtraction(self, workflow_id, options)

    def _create_workflow(
        self,
        *,
        urls: List[str],
        name: str,
        description: Optional[str],
        entity: Optional[str],
        fields: List[Dict[str, Any]],
        schema_id: Optional[str],
        monitoring: Optional[WorkflowMonitoringConfig],
        interval: Optional[WorkflowInterval],
        schedules: Optional[List[str]],
        location: Optional[LocationConfig],
        bypass_preview: bool,
        additional_data: Optional[Dict[str, Any]],
        user_prompt: Optional[str] = None,
    ) -> str:
        """Create workflow via API"""
        api = get_workflows_api(self.client)

        schema_fields = []
        for field in fields:
            if isinstance(field, SchemaResponseSchemaInner):
                schema_fields.append(field)
            elif isinstance(field, (DataField, ClassificationField)):
                schema_fields.append(SchemaResponseSchemaInner(actual_instance=field))
            elif isinstance(field, dict):
                field_type = field.get("fieldType") or field.get("field_type")
                if field_type == "CLASSIFICATION":
                    field_obj = ClassificationField(**field)
                else:
                    field_dict = dict(field)
                    if "example" in field_dict and field_dict["example"] is not None:
                        example_value = field_dict.pop("example")
                        if isinstance(example_value, (str, list)):
                            field_dict["example"] = DataFieldExample(actual_instance=example_value)
                        else:
                            field_dict["example"] = example_value
                    field_obj = DataField(**field_dict)
                schema_fields.append(SchemaResponseSchemaInner(actual_instance=field_obj))
            else:
                if hasattr(field, "model_dump"):
                    field_dict = field.model_dump()
                    field_type = field_dict.get("fieldType") or field_dict.get("field_type")
                    if field_type == "CLASSIFICATION":
                        field_obj = ClassificationField(**field_dict)
                    else:
                        if "example" in field_dict and field_dict["example"] is not None:
                            example_value = field_dict.pop("example")
                            if isinstance(example_value, (str, list)):
                                field_dict["example"] = DataFieldExample(
                                    actual_instance=example_value
                                )
                            else:
                                field_dict["example"] = example_value
                        field_obj = DataField(**field_dict)
                    schema_fields.append(SchemaResponseSchemaInner(actual_instance=field_obj))
                else:
                    field_dict = dict(field) if hasattr(field, "__dict__") else field
                    field_obj = DataField(**field_dict)
                    schema_fields.append(SchemaResponseSchemaInner(actual_instance=field_obj))

        inner = AgenticWorkflow(
            urls=urls,
            navigation_mode="agentic-navigation",
            name=name,
            description=description,
            user_prompt=user_prompt or DEFAULT_AGENTIC_PROMPT,
            schema_id=schema_id,
            entity=entity,
            fields=schema_fields,
            location=location,
            bypass_preview=bypass_preview,
            auto_start=False,
            tags=["sdk"],
            additional_data=additional_data,
        )

        if monitoring:
            inner.monitoring = monitoring
        if interval:
            inner.interval = interval
        if schedules:
            inner.schedules = schedules

        try:
            wrapper = CreateWorkflowBody(inner)
            resp = api.v4_workflows_post(create_workflow_body=wrapper)
            workflow_id = getattr(resp, "workflow_id", None) or getattr(resp, "workflowId", None)
            if not workflow_id:
                raise KadoaSdkError(
                    KadoaSdkError.ERROR_MESSAGES["NO_WORKFLOW_ID"],
                    code=KadoaErrorCode.INTERNAL_ERROR,
                    details={
                        "response": (resp.model_dump() if hasattr(resp, "model_dump") else resp)
                    },
                )
            return workflow_id
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message=KadoaSdkError.ERROR_MESSAGES["WORKFLOW_CREATE_FAILED"],
                details={"entity": entity, "fields": fields},
            )

    def _wait_for_ready(
        self,
        workflow_id: str,
        options: Optional[WaitForReadyOptions] = None,
    ) -> V4WorkflowsWorkflowIdGet200Response:
        """Wait for workflow to be ready"""
        target_state = (options.target_state if options else None) or "PREVIEW"
        poll_interval_ms = (options.poll_interval_ms if options else None) or 5000
        timeout_ms = (options.timeout_ms if options else None) or 300000

        def poll_fn() -> V4WorkflowsWorkflowIdGet200Response:
            return self._get_workflow_status(workflow_id)

        def is_complete(workflow: V4WorkflowsWorkflowIdGet200Response) -> bool:
            return workflow.state == target_state or (
                target_state == "PREVIEW" and workflow.state == "ACTIVE"
            )

        polling_options = PollingOptions(
            poll_interval_ms=poll_interval_ms,
            timeout_ms=timeout_ms,
        )

        try:
            result = poll_until(poll_fn, is_complete, polling_options)
            return result.result
        except KadoaSdkError as e:
            if e.code == KadoaErrorCode.TIMEOUT:
                raise KadoaSdkError(
                    "Workflow did not reach target state in time",
                    code=KadoaErrorCode.TIMEOUT,
                    details={"workflowId": workflow_id, "targetState": target_state},
                )
            raise

    def _run(
        self,
        workflow_id: str,
        options: ExtractOptionsInternal,
        run_options: Optional[RunWorkflowOptions] = None,
    ) -> FinishedExtraction:
        """Run workflow and wait for completion"""
        if options.interval == "REAL_TIME":
            raise KadoaSdkError(
                "run() is not supported for real-time workflows. "
                "Use wait_for_ready() and subscribe via client.realtime.on_event(...).",
                code=KadoaErrorCode.BAD_REQUEST,
                details={"interval": "REAL_TIME", "workflowId": workflow_id},
            )

        job_id = self._start_or_reuse_workflow_run(workflow_id, run_options)

        self._wait_for_job_completion(workflow_id, job_id)

        return FinishedExtraction(self, workflow_id, job_id)

    def _submit(
        self,
        workflow_id: str,
        options: ExtractOptionsInternal,
        run_options: Optional[RunWorkflowOptions] = None,
    ) -> SubmittedExtraction:
        """Submit workflow without waiting"""
        if options.interval == "REAL_TIME":
            raise KadoaSdkError(
                "submit() is not supported for real-time workflows. "
                "Use wait_for_ready() and subscribe via client.realtime.on_event(...).",
                code=KadoaErrorCode.BAD_REQUEST,
                details={"interval": "REAL_TIME", "workflowId": workflow_id},
            )

        job_id = self._start_or_reuse_workflow_run(workflow_id, run_options)
        return SubmittedExtraction(workflow_id, job_id)

    def _run_workflow(
        self,
        workflow_id: str,
        options: Optional[RunWorkflowOptions] = None,
    ) -> str:
        """Run workflow via API"""
        run_request: RunWorkflowRequest = {}
        if options:
            if options.variables:
                run_request["variables"] = options.variables
            if options.limit:
                run_request["limit"] = options.limit

        api = get_workflows_api(self.client)
        try:
            response = api.v4_workflows_workflow_id_run_put(
                workflow_id=workflow_id,
                v4_workflows_workflow_id_run_put_request=run_request,
            )
            job_id = getattr(response, "job_id", None) or getattr(response, "jobId", None)
            if not job_id:
                raise KadoaSdkError(
                    "No job ID returned from run workflow",
                    code=KadoaErrorCode.INTERNAL_ERROR,
                    details={"workflowId": workflow_id, "response": response},
                )
            return job_id
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to run workflow",
                details={"workflowId": workflow_id},
            )

    def _start_or_reuse_workflow_run(
        self,
        workflow_id: str,
        options: Optional[RunWorkflowOptions] = None,
    ) -> str:
        existing_job_id = self._find_active_workflow_job(workflow_id)
        if existing_job_id:
            return existing_job_id

        try:
            return self._run_workflow(workflow_id, options)
        except Exception as error:
            if not self._is_build_not_ready_error(error):
                raise

            recovered_job_id = self._wait_for_workflow_job(workflow_id)
            if recovered_job_id:
                return recovered_job_id

            raise

    def _find_active_workflow_job(self, workflow_id: str) -> Optional[str]:
        workflow = self._get_workflow_status(workflow_id)
        job_id = getattr(workflow, "job_id", None) or getattr(workflow, "jobId", None)
        run_state = getattr(workflow, "run_state", None) or getattr(workflow, "runState", None)

        if not job_id or not run_state:
            return None

        if str(run_state).upper() in TERMINAL_RUN_STATES:
            return None

        return str(job_id)

    def _wait_for_workflow_job(self, workflow_id: str) -> Optional[str]:
        for _ in range(5):
            current_job_id = self._find_active_workflow_job(workflow_id)
            if current_job_id:
                return current_job_id
            time.sleep(1)

        return None

    def _is_build_not_ready_error(self, error: Exception) -> bool:
        if isinstance(error, KadoaHttpError):
            response_body = error.response_body
            if isinstance(response_body, dict):
                response_error = response_body.get("error")
                if isinstance(response_error, str) and BUILD_NOT_READY_ERROR in response_error:
                    return True
            if BUILD_NOT_READY_ERROR in str(error):
                return True

        return BUILD_NOT_READY_ERROR in str(error)

    def _wait_for_job_completion(self, workflow_id: str, job_id: str) -> None:
        """Wait for job to complete using polling utility"""
        max_wait_time_ms = 300000  # 5 minutes default
        poll_interval_ms = 5000  # 5 seconds

        def poll_fn() -> Optional[str]:
            workflow = self._get_workflow_status(workflow_id)
            return workflow.run_state

        def is_complete(run_state: Optional[str]) -> bool:
            return bool(
                run_state
                and run_state.upper()
                in {
                    "FINISHED",
                    "SUCCESS",
                    "FAILED",
                    "ERROR",
                    "STOPPED",
                    "CANCELLED",
                }
            )

        polling_options = PollingOptions(
            poll_interval_ms=poll_interval_ms,
            timeout_ms=max_wait_time_ms,
        )

        try:
            poll_until(poll_fn, is_complete, polling_options)
        except KadoaSdkError as e:
            if e.code == KadoaErrorCode.TIMEOUT:
                raise KadoaSdkError(
                    "Job did not complete in time",
                    code=KadoaErrorCode.TIMEOUT,
                    details={"workflowId": workflow_id, "jobId": job_id},
                )
            raise

    def _fetch_data(self, options: FetchDataOptions) -> FetchDataResult:
        """Fetch data with pagination"""
        return self._data_fetcher.fetch_data(options)

    def _fetch_all_data(self, options: FetchDataOptions) -> List[Dict[str, Any]]:
        """Fetch all data (auto-pagination)"""
        return self._data_fetcher.fetch_all_data(options)
