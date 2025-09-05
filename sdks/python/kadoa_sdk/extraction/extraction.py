"""
Extraction functionality for Kadoa SDK.
"""

import logging
from typing import Optional, Dict, Any

from kadoa_sdk.app import KadoaSdk
from kadoa_sdk.exceptions import KadoaSdkException, KadoaErrorCode, wrap_kadoa_error
from kadoa_sdk.extraction.constants import DEFAULT_OPTIONS, ERROR_MESSAGES, SUCCESSFUL_RUN_STATES
from kadoa_sdk.extraction.types import (
    ExtractionOptions,
    ExtractionResult,
    ExtractionConfig,
    EntityRequestOptions,
)
from kadoa_sdk.extraction.entity_detector import fetch_entity_fields
from kadoa_sdk.extraction.workflow_manager import (
    create_workflow,
    wait_for_workflow_completion,
    is_terminal_run_state,
)
from kadoa_sdk.extraction.data_fetcher import fetch_workflow_data


logger = logging.getLogger(__name__)


def _validate_extraction_options(options: ExtractionOptions) -> None:
    """Validate extraction options."""
    if not options.urls or len(options.urls) == 0:
        raise KadoaSdkException(ERROR_MESSAGES["NO_URLS"], code=KadoaErrorCode.VALIDATION_ERROR)


def _is_extraction_successful(run_state: Optional[str]) -> bool:
    """Check if extraction was successful."""
    return run_state.upper() in SUCCESSFUL_RUN_STATES if run_state else False


def run_extraction(app: KadoaSdk, options: ExtractionOptions) -> ExtractionResult:
    """
    Run extraction workflow using dynamic entity detection.

    Args:
        app: The KadoaSdk instance
        options: Extraction configuration options

    Returns:
        ExtractionResult containing workflow ID, workflow details, and extracted data

    Raises:
        KadoaSdkException: If extraction fails

    Example:
        >>> from kadoa_sdk import initialize_app, KadoaSdkConfig
        >>> from kadoa_sdk.extraction import run_extraction, ExtractionOptions
        >>>
        >>> app = initialize_app(KadoaSdkConfig(api_key='your-api-key'))
        >>> result = run_extraction(
        ...     app,
        ...     ExtractionOptions(
        ...         urls=['https://example.com'],
        ...         name='My Extraction'
        ...     )
        ... )
        >>> print(f"Workflow ID: {result.workflow_id}")
        >>> print(f"Data: {result.data}")
    """
    _validate_extraction_options(options)

    # Merge user options with defaults
    config = ExtractionConfig.from_options(options, DEFAULT_OPTIONS)

    try:
        # Step 1: Detect entity fields
        logger.info(f"Detecting entity fields for URL: {config.urls[0]}")

        entity_request = EntityRequestOptions(
            link=config.urls[0], location=config.location, navigation_mode=config.navigation_mode
        )

        entity_prediction = fetch_entity_fields(app, entity_request)

        logger.info(
            f"Entity detected: {entity_prediction.entity} with {len(entity_prediction.fields)} fields"
        )

        # Emit entity:detected event
        app.emit(
            "entity:detected",
            {
                "entity": entity_prediction.entity,
                "fields": [field.to_dict() for field in entity_prediction.fields],
                "url": config.urls[0],
            },
            "extraction",
            {
                "navigationMode": config.navigation_mode,
                "location": config.location.__dict__ if config.location else None,
            },
        )

        # Step 2: Create workflow
        logger.info("Creating extraction workflow...")

        workflow_id = create_workflow(
            app=app,
            urls=config.urls,
            navigation_mode=config.navigation_mode,
            entity=entity_prediction.entity,
            fields=entity_prediction.fields,
            name=config.name,
        )

        logger.info(f"Workflow created with ID: {workflow_id}")

        # Emit extraction:started event
        app.emit(
            "extraction:started",
            {"workflowId": workflow_id, "name": config.name, "urls": config.urls},
            "extraction",
        )

        # Step 3: Wait for completion
        logger.info("Waiting for extraction to complete...")

        def on_status_change(change: Dict[str, Any]) -> None:
            logger.debug(
                f"Workflow {change['workflowId']} status: "
                f"{change['currentState']}/{change['currentRunState']}"
            )

        workflow_status = wait_for_workflow_completion(
            app=app,
            workflow_id=workflow_id,
            polling_interval=config.polling_interval,
            max_wait_time=config.max_wait_time,
            on_status_change=on_status_change,
        )

        # Step 4: Fetch data if successful
        data = None
        is_success = workflow_status.is_successful()

        if is_success:
            logger.info(f"Extraction completed successfully. Fetching data...")
            data = fetch_workflow_data(app, workflow_id, config.data_limit)

            if data:
                logger.info(f"Retrieved {len(data)} records from workflow {workflow_id}")

                # Emit extraction:data_available event
                app.emit(
                    "extraction:data_available",
                    {"workflowId": workflow_id, "recordCount": len(data), "isPartial": False},
                    "extraction",
                )
            else:
                logger.warning(f"No data retrieved from workflow {workflow_id}")

            # Emit extraction:completed event (success)
            app.emit(
                "extraction:completed",
                {
                    "workflowId": workflow_id,
                    "success": True,
                    "finalRunState": workflow_status.run_state,
                    "finalState": workflow_status.state,
                    "recordCount": len(data) if data else 0,
                },
                "extraction",
            )
        else:
            error_msg = f"Extraction completed with unexpected status: {workflow_status.run_state}"
            logger.error(error_msg)

            # Emit extraction:completed event (failure)
            app.emit(
                "extraction:completed",
                {
                    "workflowId": workflow_id,
                    "success": False,
                    "finalRunState": workflow_status.run_state,
                    "finalState": workflow_status.state,
                    "error": error_msg,
                },
                "extraction",
            )

            raise KadoaSdkException(
                error_msg,
                code=KadoaErrorCode.INTERNAL_ERROR,
                details={
                    "workflow_id": workflow_id,
                    "run_state": workflow_status.run_state,
                    "state": workflow_status.state,
                },
            )

        return ExtractionResult(workflow_id=workflow_id, workflow=workflow_status, data=data)

    except Exception as error:
        raise wrap_kadoa_error(error, ERROR_MESSAGES["EXTRACTION_FAILED"], {"urls": options.urls})


# Re-export helper for checking terminal states
export_is_terminal_run_state = is_terminal_run_state
