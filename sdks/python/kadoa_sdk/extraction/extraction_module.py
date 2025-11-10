from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING, Any, Dict, List, Optional

if TYPE_CHECKING:  # pragma: no cover
    from ..client import KadoaClient
from ..core.exceptions import KadoaErrorCode, KadoaHttpError, KadoaSdkError
from .extraction_acl import GetJobResponse, RunWorkflowResponse
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
    """Module for running and managing data extractions.

    Provides methods to run extractions, submit workflows, fetch data,
    and manage extraction workflows. Supports both synchronous execution
    and asynchronous data fetching with pagination.

    Args:
        client: The KadoaClient instance for API access
    """

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
        """Run an extraction workflow and wait for completion.

        Automatically detects entities from the provided URLs, creates a workflow,
        waits for it to complete, and returns the extracted data.

        Args:
            options: Extraction options including URLs, name, and configuration

        Returns:
            ExtractionResult: Result containing:
                - workflow_id: The created workflow ID
                - workflow: Workflow status information
                - data: List of extracted records (Dict[str, Any] for each record)
                - pagination: Pagination information if applicable

        Raises:
            KadoaSdkError: If validation fails or extraction encounters errors
            KadoaHttpError: If API requests fail

        Example:
            ```python
            result = client.extraction.run(
                ExtractionOptions(
                    urls=["https://example.com/products"],
                    name="Product Extraction",
                    max_records=100
                )
            )
            print(f"Extracted {len(result.data)} products")
            ```
        """
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

            data: Optional[List[Dict[str, Any]]] = None
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
        """Submit an extraction workflow for asynchronous processing.

        Creates a workflow and starts execution without waiting for completion.
        Use this when you want to check status or fetch data later.

        Args:
            options: Extraction options including URLs, name, and configuration

        Returns:
            SubmitExtractionResult: Result containing:
                - workflow_id: The created workflow ID
                - needs_notification_setup: Whether notification setup is required

        Raises:
            KadoaSdkError: If validation fails or workflow creation fails
            KadoaHttpError: If API requests fail

        Example:
            ```python
            result = client.extraction.submit(
                ExtractionOptions(
                    urls=["https://example.com"],
                    name="Async Extraction"
                )
            )
            # Check status later or fetch data when ready
            data = client.extraction.fetch_data(
                FetchDataOptions(workflow_id=result.workflow_id)
            )
            ```
        """
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
        """Fetch a page of workflow data with pagination support.

        Retrieves a single page of extracted data from a workflow.
        Use pagination info to fetch additional pages if needed.

        Args:
            options: Fetch data options including:
                - workflow_id: The workflow ID (required)
                - run_id: Optional specific run ID
                - page: Page number (default: 1)
                - limit: Records per page (default: 100)
                - sort_by: Field to sort by
                - order: Sort order ("asc" or "desc")
                - filters: Filter string
                - include_anomalies: Whether to include anomaly data

        Returns:
            FetchDataResult: Result containing:
                - data: List of extracted records for this page
                - workflow_id: The workflow ID
                - run_id: The run ID if specified
                - executed_at: Execution timestamp
                - pagination: Pagination information (total_count, page, total_pages, limit)

        Raises:
            KadoaHttpError: If API request fails

        Example:
            ```python
            # Fetch first page
            result = client.extraction.fetch_data(
                FetchDataOptions(
                    workflow_id="workflow-123",
                    page=1,
                    limit=50
                )
            )
            print(f"Page {result.pagination.page} of {result.pagination.total_pages}")
            print(f"Total records: {result.pagination.total_count}")

            # Fetch next page
            if result.pagination.page < result.pagination.total_pages:
                next_page = client.extraction.fetch_data(
                    FetchDataOptions(
                        workflow_id="workflow-123",
                        page=result.pagination.page + 1,
                        limit=50
                    )
                )
            ```
        """
        return self.data_fetcher.fetch_data(options)

    def fetch_all_data(self, options: FetchDataOptions) -> List[Dict[str, Any]]:
        """Fetch all pages of workflow data (auto-pagination).

        Automatically fetches all pages of data from a workflow and returns
        a combined list. This is a convenience method that handles pagination
        internally.

        Args:
            options: Fetch data options. Note that page will be overridden
                to fetch all pages. Limit controls records per page request.

        Returns:
            List[Dict[str, Any]]: Combined list of all extracted records
                across all pages. Each record is a dictionary with extracted fields.

        Raises:
            KadoaHttpError: If API requests fail

        Example:
            ```python
            # Fetch all data automatically
            all_data = client.extraction.fetch_all_data(
                FetchDataOptions(
                    workflow_id="workflow-123",
                    limit=100  # Records per page request
                )
            )
            print(f"Total records fetched: {len(all_data)}")
            ```
        """
        return self.data_fetcher.fetch_all_data(options)

    async def fetch_data_pages(
        self, options: FetchDataOptions
    ) -> AsyncGenerator[FetchDataResult, None]:
        """Async generator for paginated workflow data pages.

        Provides an async generator that yields pages of data as they're fetched.
        Useful for processing large datasets without loading everything into memory.

        Args:
            options: Fetch data options. Limit controls records per page.

        Yields:
            FetchDataResult: Each page of data with pagination info

        Raises:
            KadoaHttpError: If API requests fail

        Example:
            ```python
            async for page in client.extraction.fetch_data_pages(
                FetchDataOptions(workflow_id="workflow-123", limit=100)
            ):
                print(f"Processing page {page.pagination.page}")
                for record in page.data:
                    process_record(record)
            ```
        """
        async for page in self.data_fetcher.fetch_data_pages(options):
            yield page

    def run_job(
        self, workflow_id: str, input: Optional[RunWorkflowOptions] = None
    ) -> RunWorkflowResponse:
        """Trigger a workflow run without waiting.

        Starts a workflow execution and returns immediately with job information.
        Use this when you want to check status or fetch data asynchronously.

        Args:
            workflow_id: The workflow ID to run
            input: Optional run options including:
                - variables: Dictionary of workflow variables
                - limit: Maximum records to extract

        Returns:
            RunWorkflowResponse: Response containing job_id, message, and status

        Raises:
            KadoaHttpError: If API request fails

        Example:
            ```python
            response = client.extraction.run_job(
                "workflow-123",
                RunWorkflowOptions(variables={"category": "electronics"}, limit=100)
            )
            print(f"Job ID: {response.job_id}")
            ```
        """
        return self.client.workflow.run_workflow(workflow_id, input=input)

    def run_job_and_wait(
        self, workflow_id: str, input: Optional[RunWorkflowOptions] = None
    ) -> GetJobResponse:
        """Trigger a workflow run and wait for completion.

        Starts a workflow execution and polls until it reaches a terminal state
        (FINISHED, SUCCESS, FAILED, etc.). This is a blocking operation.

        Args:
            workflow_id: The workflow ID to run
            input: Optional run options including:
                - variables: Dictionary of workflow variables
                - limit: Maximum records to extract

        Returns:
            GetJobResponse: Job response when terminal state is reached,
                containing state, run_state, and other job information

        Raises:
            KadoaSdkError: If timeout occurs or job fails
            KadoaHttpError: If API requests fail

        Example:
            ```python
            job = client.extraction.run_job_and_wait(
                "workflow-123",
                RunWorkflowOptions(limit=50)
            )
            print(f"Job completed with state: {job.state}")
            ```
        """
        result = self.run_job(workflow_id, input)
        job_id = getattr(result, "job_id", None) or getattr(result, "jobId", None)
        if not job_id:
            raise KadoaSdkError(
                "No job ID returned from run workflow",
                code=KadoaErrorCode.INTERNAL_ERROR,
                details={"workflowId": workflow_id, "response": result},
            )

        return self.client.workflow.wait_for_job_completion(workflow_id, job_id)

    def resume_workflow(self, workflow_id: str) -> ExtractionResult:
        """Resume a workflow after notification setup.

        Resumes a paused workflow (typically paused for notification setup)
        and waits for completion, then returns the extracted data.

        Args:
            workflow_id: The workflow ID to resume

        Returns:
            ExtractionResult: Result containing workflow, data, and pagination

        Raises:
            KadoaSdkError: If workflow fails or times out
            KadoaHttpError: If API requests fail

        Example:
            ```python
            result = client.extraction.resume_workflow("workflow-123")
            print(f"Resumed workflow extracted {len(result.data)} records")
            ```
        """
        self.client.workflow.resume(workflow_id)

        workflow = self.client.workflow.wait(
            workflow_id,
            poll_interval_ms=int(DEFAULTS["polling_interval"] * 1000),
            timeout_ms=int(DEFAULTS["max_wait_time"] * 1000),
        )

        data: Optional[List[Dict[str, Any]]] = None
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

    def get_notification_channels(self, workflow_id: str) -> List["NotificationChannel"]:
        """List notification channels for a workflow.

        Retrieves all notification channels configured for a specific workflow.

        Args:
            workflow_id: The workflow ID

        Returns:
            List[NotificationChannel]: List of notification channel objects
                containing channel type, ID, name, and configuration

        Raises:
            KadoaHttpError: If API request fails

        Example:
            ```python
            channels = client.extraction.get_notification_channels("workflow-123")
            for channel in channels:
                print(f"Channel: {channel.channel_type} - {channel.name}")
            ```
        """
        from ..notifications.notifications_acl import ListChannelsRequest, NotificationChannel

        return self.client.notification.channels.list_channels(
            ListChannelsRequest(workflow_id=workflow_id)
        )

    def get_notification_settings(self, workflow_id: str) -> List["NotificationSettings"]:
        """List notification settings for a workflow.

        Retrieves all notification settings configured for a specific workflow,
        including which events trigger notifications and which channels are used.

        Args:
            workflow_id: The workflow ID

        Returns:
            List[NotificationSettings]: List of notification settings objects
                containing event types, channel IDs, and enabled status

        Raises:
            KadoaHttpError: If API request fails

        Example:
            ```python
            settings = client.extraction.get_notification_settings("workflow-123")
            for setting in settings:
                print(f"Event: {setting.event_type}, Enabled: {setting.enabled}")
            ```
        """
        from ..notifications.notifications_acl import ListSettingsRequest, NotificationSettings

        return self.client.notification.settings.list_settings(
            ListSettingsRequest(workflow_id=workflow_id)
        )


def run_extraction(client: "KadoaClient", options: ExtractionOptions) -> ExtractionResult:
    return client.extraction.run(options)
