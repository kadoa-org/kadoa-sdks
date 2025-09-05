"""
Workflow management for extraction operations.
"""

import json
import time

from kadoa_sdk.exceptions import KadoaErrorCode, KadoaSdkException, wrap_kadoa_error
from kadoa_sdk.extraction.client import get_workflows_api
from kadoa_sdk.extraction.constants import ERROR_MESSAGES
from kadoa_sdk.extraction.types import CreateWorkflowOptions, WorkflowStatus
from kadoa_sdk.kadoa_sdk import KadoaSdk
from openapi_client import ApiException
from openapi_client.models import (
    V4WorkflowsPostRequest,
    WorkflowWithCustomSchema,
    WorkflowWithCustomSchemaFieldsInner,
)


def create_workflow(sdk: KadoaSdk, options: CreateWorkflowOptions) -> str:
    """
    Create a new workflow with the provided configuration.

    Args:
        sdk: The KadoaSdk instance
        urls: List of URLs to extract from
        navigation_mode: Navigation mode for the workflow
        entity: Entity type to extract
        fields: List of fields to extract
        name: Workflow name
        max_records: Maximum number of records to extract
    Returns:
        The workflow ID

    Raises:
        KadoaSdkException: If workflow creation fails
    """
    workflows_api = get_workflows_api(sdk)

    fields_models = []
    for f in options.fields:
        example_value = f.example
        if example_value is not None and not isinstance(example_value, str):
            example_value = str(example_value)

        fields_models.append(
            WorkflowWithCustomSchemaFieldsInner(
                name=f.name,
                description=f.description,
                example=example_value,
                data_type=f.data_type,
            )
        )

    request_body = V4WorkflowsPostRequest(
        WorkflowWithCustomSchema(
            urls=options.urls,
            navigation_mode=options.navigation_mode,
            entity=options.entity,
            name=options.name,
            fields=fields_models,
            bypass_preview=True,
            limit=options.max_records,
            tags=["sdk"],
        )
    )

    try:
        response = workflows_api.v4_workflows_post(request_body)
        workflow_id = response.workflow_id

        if not workflow_id:
            raise KadoaSdkException(
                ERROR_MESSAGES["NO_WORKFLOW_ID"],
                code=KadoaErrorCode.INTERNAL_ERROR,
                details={"urls": options.urls},
            )

        return workflow_id

    except ApiException as error:
        raise wrap_kadoa_error(
            error,
            "Failed to create workflow",
            {"urls": options.urls, "entity": options.entity, "name": options.name},
        ) from error
    except Exception as error:
        raise wrap_kadoa_error(
            error,
            "Failed to create workflow",
            {"urls": options.urls, "entity": options.entity, "name": options.name},
        ) from error


def get_workflow_status(sdk: KadoaSdk, workflow_id: str) -> WorkflowStatus:
    """
    Get the current status of a workflow.

    Args:
        sdk: The KadoaSdk instance
        workflow_id: The workflow ID

    Returns:
        WorkflowStatus object with current workflow state

    Raises:
        KadoaSdkException: If status check fails
    """
    try:
        api = get_workflows_api(sdk)
        raw_resp = api.v4_workflows_workflow_id_get_without_preload_content(workflow_id)
        body = raw_resp.read()
        data = json.loads(body)

        return WorkflowStatus(
            workflow_id=workflow_id,
            state=data.get("state"),
            run_state=data.get("runState"),
            created_at=data.get("createdAt"),
            updated_at=data.get("updatedAt"),
        )

    except Exception as error:
        raise wrap_kadoa_error(
            error, ERROR_MESSAGES["PROGRESS_CHECK_FAILED"], {"workflow_id": workflow_id}
        ) from error


def wait_for_workflow_completion(
    sdk: KadoaSdk,
    workflow_id: str,
    polling_interval: int = 5000,
    max_wait_time: int = 300000,
) -> WorkflowStatus:
    """
    Poll workflow status until it reaches a terminal state.

    Args:
        sdk: The KadoaSdk instance
        workflow_id: The workflow ID to monitor
        polling_interval: Milliseconds between status checks
        max_wait_time: Maximum milliseconds to wait before timeout

    Returns:
        Final WorkflowStatus when completed

    Raises:
        KadoaSdkException: If timeout occurs or status check fails
    """
    polling_interval_sec = polling_interval / 1000.0
    max_wait_time_sec = max_wait_time / 1000.0
    start_time = time.time()

    previous_state = None
    previous_run_state = None

    while time.time() - start_time < max_wait_time_sec:
        workflow_status = get_workflow_status(sdk, workflow_id)

        if (
            workflow_status.state != previous_state
            or workflow_status.run_state != previous_run_state
        ):
            status_change = {
                "workflowId": workflow_id,
                "previousState": previous_state,
                "previousRunState": previous_run_state,
                "currentState": workflow_status.state,
                "currentRunState": workflow_status.run_state,
            }

            sdk.emit("extraction:status_changed", status_change, "extraction")

            previous_state = workflow_status.state
            previous_run_state = workflow_status.run_state

        if workflow_status.is_terminal():
            return workflow_status

        time.sleep(polling_interval_sec)

    raise KadoaSdkException(
        f"Extraction did not complete within {max_wait_time / 1000} seconds",
        code=KadoaErrorCode.TIMEOUT,
        details={"workflow_id": workflow_id, "max_wait_time": max_wait_time},
    )
