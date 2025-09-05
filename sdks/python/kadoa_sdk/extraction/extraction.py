"""
Extraction functionality for Kadoa SDK.
"""

from kadoa_sdk.exceptions import KadoaErrorCode, KadoaSdkException, wrap_kadoa_error
from kadoa_sdk.extraction.constants import DEFAULT_OPTIONS, ERROR_MESSAGES
from kadoa_sdk.extraction.data_fetcher import fetch_workflow_data
from kadoa_sdk.extraction.entity_detector import fetch_entity_fields
from kadoa_sdk.extraction.types import (
    CreateWorkflowOptions,
    EntityRequestOptions,
    ExtractionConfig,
    ExtractionOptions,
    ExtractionResult,
)
from kadoa_sdk.extraction.workflow_manager import (
    create_workflow,
    wait_for_workflow_completion,
)
from kadoa_sdk.kadoa_sdk import KadoaSdk


def _validate_extraction_options(options: ExtractionOptions) -> None:
    """Validate extraction options."""
    if not options.urls or len(options.urls) == 0:
        raise KadoaSdkException(ERROR_MESSAGES["NO_URLS"], code=KadoaErrorCode.VALIDATION_ERROR)


def run_extraction(sdk: KadoaSdk, options: ExtractionOptions) -> ExtractionResult:
    """
    Run extraction workflow using dynamic entity detection.

    Args:
        sdk: The KadoaSdk instance
        options: Extraction configuration options

    Returns:
        ExtractionResult containing workflow ID, workflow details, and extracted data

    Raises:
        KadoaSdkException: If extraction fails

    Example:
        >>> from kadoa_sdk import initialize_sdk, KadoaSdkConfig
        >>> from kadoa_sdk.extraction import run_extraction, ExtractionOptions
        >>>
        >>> sdk = initialize_sdk(KadoaSdkConfig(api_key='your-api-key'))
        >>> result = run_extraction(
        ...     sdk,
        ...     ExtractionOptions(
        ...         urls=['https://example.com'],
        ...         name='My Extraction'
        ...     )
        ... )
        >>> print(f"Workflow ID: {result.workflow_id}")
        >>> print(f"Data: {result.data}")
    """
    _validate_extraction_options(options)

    config = ExtractionConfig.from_options(options, DEFAULT_OPTIONS)

    try:
        entity_request = EntityRequestOptions(
            link=config.urls[0], location=config.location, navigation_mode=config.navigation_mode
        )

        entity_prediction = fetch_entity_fields(sdk, entity_request)

        sdk.emit(
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
        workflow_id = create_workflow(
            sdk=sdk,
            options=CreateWorkflowOptions(
                urls=config.urls,
                navigation_mode=config.navigation_mode,
                entity=entity_prediction.entity,
                fields=entity_prediction.fields,
                name=config.name,
                max_records=config.max_records,
            ),
        )

        sdk.emit(
            "extraction:started",
            {"workflowId": workflow_id, "name": config.name, "urls": config.urls},
            "extraction",
        )

        # Step 3: Wait for completion

        workflow_status = wait_for_workflow_completion(
            sdk=sdk,
            workflow_id=workflow_id,
            polling_interval=config.polling_interval,
            max_wait_time=config.max_wait_time,
        )

        # Step 4: Fetch data if successful
        data = None
        is_success = workflow_status.is_successful()

        if is_success:
            data = fetch_workflow_data(sdk, workflow_id)

            if data:
                sdk.emit(
                    "extraction:data_available",
                    {"workflowId": workflow_id, "recordCount": len(data), "isPartial": False},
                    "extraction",
                )

            sdk.emit(
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

            sdk.emit(
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
        raise wrap_kadoa_error(
            error, ERROR_MESSAGES["EXTRACTION_FAILED"], {"urls": options.urls}
        ) from error
