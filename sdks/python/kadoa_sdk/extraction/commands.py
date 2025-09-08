from __future__ import annotations

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:  # pragma: no cover
    from ..client import KadoaClient
from ..core.command import Command
from ..core.exceptions import KadoaHttpException, KadoaSdkException
from .services import (
    DataFetcherService,
    EntityDetectorService,
    WorkflowManagerService,
)
from .types import DEFAULTS, ExtractionOptions, ExtractionResult

SUCCESSFUL_RUN_STATES = {"FINISHED", "SUCCESS"}


class RunExtractionCommand(Command[ExtractionResult, ExtractionOptions]):
    def __init__(self, client: "KadoaClient") -> None:
        self.client = client
        self.data_fetcher = DataFetcherService(client)
        self.entity_detector = EntityDetectorService(client)
        self.workflow_manager = WorkflowManagerService(client)

    def execute(self, options: ExtractionOptions) -> ExtractionResult:
        self._validate_options(options)

        config = ExtractionOptions(
            urls=options.urls,
            location=options.location or DEFAULTS["location"],
            max_records=options.max_records or DEFAULTS["max_records"],
            max_wait_time=options.max_wait_time or DEFAULTS["max_wait_time"],
            name=options.name or DEFAULTS["name"],
            navigation_mode=options.navigation_mode or DEFAULTS["navigation_mode"],
            polling_interval=options.polling_interval
            or DEFAULTS["polling_interval"],
        )

        try:
            prediction = self.entity_detector.fetch_entity_fields(
                link=config.urls[0],
                location=config.location or {"type": "auto"},
                navigation_mode=str(config.navigation_mode),
            )
            self.client.emit(
                "entity:detected",
                {
                    "entity": prediction["entity"],
                    "fields": prediction["fields"],
                    "url": config.urls[0],
                },
                "extraction",
                {
                    "location": config.location,
                    "navigationMode": config.navigation_mode,
                },
            )

            workflow_id = self.workflow_manager.create_workflow(
                entity=prediction["entity"], fields=prediction["fields"], config=config
            )
            self.client.emit(
                "extraction:started",
                {
                    "workflowId": workflow_id,
                    "name": config.name or "",
                    "urls": config.urls,
                },
                "extraction",
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

            if is_success:
                data = self.data_fetcher.fetch_workflow_data(
                    workflow_id, config.max_records or DEFAULTS["max_records"]
                )
                if data is not None:
                    self.client.emit(
                        "extraction:data_available",
                        {
                            "workflowId": workflow_id,
                            "recordCount": len(data),
                            "isPartial": False,
                        },
                        "extraction",
                    )
                self.client.emit(
                    "extraction:completed",
                    {
                        "finalRunState": workflow.run_state,
                        "finalState": workflow.state,
                        "recordCount": len(data or []),
                        "success": True,
                        "workflowId": workflow_id,
                    },
                    "extraction",
                )
            else:
                self.client.emit(
                    "extraction:completed",
                    {
                        "error": (
                            "Extraction completed with unexpected status: "
                            f"{workflow.run_state}"
                        ),
                        "finalRunState": workflow.run_state,
                        "finalState": workflow.state,
                        "success": False,
                        "workflowId": workflow_id,
                    },
                    "extraction",
                )
                raise KadoaSdkException(
                    f"{KadoaSdkException.ERROR_MESSAGES['WORKFLOW_UNEXPECTED_STATUS']}: "
                    f"{workflow.run_state}",
                    code="INTERNAL_ERROR",
                    details={
                        "runState": workflow.run_state,
                        "state": workflow.state,
                        "workflowId": workflow_id,
                    },
                )

            return ExtractionResult(
                workflow_id=workflow_id, workflow=workflow, data=data
            )
        except Exception as error:
            raise KadoaHttpException.wrap(
                error,
                message=KadoaSdkException.ERROR_MESSAGES["EXTRACTION_FAILED"],
                details={"urls": options.urls},
            )

    def _validate_options(self, options: ExtractionOptions) -> None:
        if not options.urls or len(options.urls) == 0:
            raise KadoaSdkException(
                KadoaSdkException.ERROR_MESSAGES["NO_URLS"], code="VALIDATION_ERROR"
            )


