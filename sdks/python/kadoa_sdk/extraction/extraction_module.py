from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING, Any, Dict, Optional

if TYPE_CHECKING:  # pragma: no cover
    from ..client import KadoaClient
from ..core.exceptions import KadoaErrorCode, KadoaHttpError, KadoaSdkError
from .services import (
    DataFetcherService,
    EntityDetectorService,
    WorkflowManagerService,
)
from .types import (
    DEFAULTS,
    ExtractionOptions,
    ExtractionResult,
    FetchDataOptions,
    FetchDataResult,
    RunWorkflowOptions,
    SubmitExtractionResult,
)

SUCCESSFUL_RUN_STATES = {"FINISHED", "SUCCESS"}


class ExtractionModule:
    def __init__(self, client: "KadoaClient") -> None:
        self.client = client
        self.data_fetcher = DataFetcherService(client)
        self.entity_detector = EntityDetectorService(client)
        self.workflow_manager = WorkflowManagerService(client)

    def _validate_options(self, options: ExtractionOptions) -> None:
        if not options.urls or len(options.urls) == 0:
            raise KadoaSdkError(
                KadoaSdkError.ERROR_MESSAGES["NO_URLS"], code=KadoaErrorCode.VALIDATION_ERROR
            )

    def run(self, options: ExtractionOptions) -> ExtractionResult:
        self._validate_options(options)

        config = ExtractionOptions(
            urls=options.urls,
            location=options.location or DEFAULTS["location"],
            max_records=options.max_records or DEFAULTS["max_records"],
            max_wait_time=options.max_wait_time or DEFAULTS["max_wait_time"],
            name=options.name,
            navigation_mode=options.navigation_mode or DEFAULTS["navigation_mode"],
            polling_interval=options.polling_interval or DEFAULTS["polling_interval"],
        )

        try:
            prediction = self.entity_detector.fetch_entity_fields(
                link=config.urls[0],
                location=config.location or {"type": "auto"},
                navigation_mode=str(config.navigation_mode),
            )

            workflow_id = self.workflow_manager.create_workflow(
                entity=prediction["entity"], fields=prediction["fields"], config=config
            )

            workflow = self.workflow_manager.wait_for_workflow_completion(
                workflow_id,
                float(config.polling_interval or DEFAULTS["polling_interval"]),
                float(config.max_wait_time or DEFAULTS["max_wait_time"]),
            )

            data: Optional[list] = None
            is_success = bool(
                workflow.run_state and workflow.run_state.upper() in SUCCESSFUL_RUN_STATES
            )

            pagination = None
            if is_success:
                data_result = self.data_fetcher.fetch_data(
                    FetchDataOptions(
                        workflow_id=workflow_id,
                        limit=config.max_records or DEFAULTS["max_records"],
                    )
                )
                data = data_result.data
                pagination = data_result.pagination
            else:
                raise KadoaSdkError(
                    f"{KadoaSdkError.ERROR_MESSAGES['WORKFLOW_UNEXPECTED_STATUS']}: "
                    f"{workflow.run_state}",
                    code=KadoaErrorCode.INTERNAL_ERROR,
                    details={
                        "runState": workflow.run_state,
                        "state": workflow.state,
                        "workflowId": workflow_id,
                    },
                )

            return ExtractionResult(
                workflow_id=workflow_id, workflow=workflow, data=data, pagination=pagination
            )
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message=KadoaSdkError.ERROR_MESSAGES["EXTRACTION_FAILED"],
                details={"urls": options.urls},
            )

    def submit(self, options: ExtractionOptions) -> SubmitExtractionResult:
        """Submit an extraction workflow for asynchronous processing"""
        self._validate_options(options)

        config = ExtractionOptions(
            urls=options.urls,
            location=options.location or DEFAULTS["location"],
            max_records=options.max_records or DEFAULTS["max_records"],
            max_wait_time=options.max_wait_time or DEFAULTS["max_wait_time"],
            name=options.name,
            navigation_mode=options.navigation_mode or DEFAULTS["navigation_mode"],
            polling_interval=options.polling_interval or DEFAULTS["polling_interval"],
        )

        try:
            prediction = self.entity_detector.fetch_entity_fields(
                link=config.urls[0],
                location=config.location or {"type": "auto"},
                navigation_mode=str(config.navigation_mode),
            )

            workflow_id = self.workflow_manager.create_workflow(
                entity=prediction["entity"], fields=prediction["fields"], config=config
            )

            # Submit workflow run without waiting
            from ...core.http import get_workflows_api

            api = get_workflows_api(self.client)
            try:
                api.v4_workflows_workflow_id_run_put(
                    workflow_id=workflow_id,
                    v4_workflows_workflow_id_run_put_request={},
                )
            except Exception:
                # If run fails, workflow is still created
                pass

            return SubmitExtractionResult(workflow_id=workflow_id)
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message=KadoaSdkError.ERROR_MESSAGES["EXTRACTION_FAILED"],
                details={"urls": options.urls},
            )

    def fetch_data(self, options: FetchDataOptions) -> FetchDataResult:
        """
        Fetch a page of workflow data with pagination support

        Args:
            options: Fetch data options including workflow_id, run_id, pagination, etc.

        Returns:
            FetchDataResult with data and pagination info
        """
        return self.data_fetcher.fetch_data(options)

    def fetch_all_data(self, options: FetchDataOptions) -> list[dict]:
        """
        Fetch all pages of workflow data (auto-pagination)

        Args:
            options: Fetch data options (page and limit will be overridden)

        Returns:
            List of all data items across all pages
        """
        return self.data_fetcher.fetch_all_data(options)

    async def fetch_data_pages(
        self, options: FetchDataOptions
    ) -> AsyncGenerator[FetchDataResult, None]:
        """
        Async generator for paginated workflow data pages

        Args:
            options: Fetch data options

        Yields:
            FetchDataResult for each page
        """
        async for page in self.data_fetcher.fetch_data_pages(options):
            yield page

    def run_job(
        self, workflow_id: str, input: Optional[RunWorkflowOptions] = None
    ) -> Dict[str, Optional[str]]:
        """
        Trigger a workflow run without waiting

        Args:
            workflow_id: Workflow ID
            input: Optional run workflow options (variables, limit)

        Returns:
            Response with job_id, message, and status
        """
        variables = input.variables if input else None
        limit = input.limit if input else None
        return self.client.workflow.run_workflow(workflow_id, variables=variables, limit=limit)

    def run_job_and_wait(
        self, workflow_id: str, input: Optional[RunWorkflowOptions] = None
    ) -> Dict[str, Any]:
        """
        Trigger a workflow run and wait for completion

        Args:
            workflow_id: Workflow ID
            input: Optional run workflow options (variables, limit)

        Returns:
            Job response when terminal state is reached
        """
        result = self.run_job(workflow_id, input)
        job_id = result.get("job_id") or result.get("jobId")
        if not job_id:
            raise KadoaSdkError(
                "No job ID returned from run workflow",
                code=KadoaErrorCode.INTERNAL_ERROR,
                details={"workflowId": workflow_id, "response": result},
            )

        return self.client.workflow.wait_for_job_completion(workflow_id, job_id)

    def resume_workflow(self, workflow_id: str) -> ExtractionResult:
        """
        Resume a workflow after notification setup

        Args:
            workflow_id: Workflow ID

        Returns:
            ExtractionResult with workflow, data, and pagination
        """
        self.client.workflow.resume(workflow_id)

        workflow = self.client.workflow.wait(
            workflow_id,
            poll_interval_ms=int(DEFAULTS["polling_interval"] * 1000),
            timeout_ms=int(DEFAULTS["max_wait_time"] * 1000),
        )

        data: Optional[list] = None
        pagination = None
        is_success = bool(
            workflow.run_state and workflow.run_state.upper() in SUCCESSFUL_RUN_STATES
        )

        if is_success:
            data_result = self.data_fetcher.fetch_data(FetchDataOptions(workflow_id=workflow_id))
            data = data_result.data
            pagination = data_result.pagination
        else:
            raise KadoaSdkError(
                f"{KadoaSdkError.ERROR_MESSAGES['WORKFLOW_UNEXPECTED_STATUS']}: "
                f"{workflow.run_state}",
                code=KadoaErrorCode.INTERNAL_ERROR,
                details={
                    "runState": workflow.run_state,
                    "state": workflow.state,
                    "workflowId": workflow_id,
                },
            )

        return ExtractionResult(
            workflow_id=workflow_id, workflow=workflow, data=data, pagination=pagination
        )

    def get_notification_channels(self, workflow_id: str) -> list:
        """
        List notification channels for a workflow

        Args:
            workflow_id: Workflow ID

        Returns:
            List of notification channels
        """
        from ..notifications.notifications_acl import ListChannelsRequest

        return self.client.notification.channels.list_channels(
            ListChannelsRequest(workflow_id=workflow_id)
        )

    def get_notification_settings(self, workflow_id: str) -> list:
        """
        List notification settings for a workflow

        Args:
            workflow_id: Workflow ID

        Returns:
            List of notification settings
        """
        from ..notifications.notifications_acl import ListSettingsRequest

        return self.client.notification.settings.list_settings(
            ListSettingsRequest(workflow_id=workflow_id)
        )


def run_extraction(client: "KadoaClient", options: ExtractionOptions) -> ExtractionResult:
    return client.extraction.run(options)
