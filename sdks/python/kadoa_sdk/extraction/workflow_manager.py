"""
Workflow management for extraction operations.
"""

import time
from typing import List, Optional

from kadoa_sdk.kadoa_sdk import KadoaSdk
from kadoa_sdk.exceptions import KadoaSdkException, KadoaErrorCode, wrap_kadoa_error
from kadoa_sdk.extraction.client import get_workflows_api
from kadoa_sdk.extraction.constants import (
    ERROR_MESSAGES,
    MAX_DATA_LIMIT,
    TERMINAL_RUN_STATES,
    SUCCESSFUL_RUN_STATES,
)
from kadoa_sdk.extraction.types import EntityField, WorkflowStatus

from openapi_client import ApiException




def is_terminal_run_state(run_state: Optional[str]) -> bool:
    """Check if a workflow runState is terminal (finished processing)."""
    if not run_state:
        return False
    return run_state.upper() in TERMINAL_RUN_STATES


def is_successful_run_state(run_state: Optional[str]) -> bool:
    """Check if a workflow completed successfully."""
    if not run_state:
        return False
    return run_state.upper() in SUCCESSFUL_RUN_STATES


def create_workflow(
    sdk: KadoaSdk,
    urls: List[str],
    navigation_mode: str,
    entity: str,
    fields: List[EntityField],
    name: str,
) -> str:
    """
    Create a new workflow with the provided configuration.

    Args:
        sdk: The KadoaSdk instance
        urls: List of URLs to extract from
        navigation_mode: Navigation mode for the workflow
        entity: Entity type to extract
        fields: List of fields to extract
        name: Workflow name

    Returns:
        The workflow ID

    Raises:
        KadoaSdkException: If workflow creation fails
    """
    workflows_api = get_workflows_api(sdk)

    # Convert fields to dict format for API
    fields_dict = [field.to_dict() for field in fields]

    # Create workflow request as a dictionary
    workflow_dict = {
        "urls": urls,
        "navigationMode": navigation_mode,
        "entity": entity,
        "name": name,
        "fields": fields_dict,
        "bypassPreview": True,
        "limit": MAX_DATA_LIMIT,
        "tags": ["sdk"],
    }

    # Make direct HTTP call to bypass pydantic validation issues
    try:
        # Use the sdk's session directly
        import json

        response = sdk.session.post(
            f"{sdk.base_url}/v4/workflows",
            json=workflow_dict,
            headers={
                "Content-Type": "application/json",
                "X-API-Key": sdk.configuration.api_key.get("ApiKeyAuth", ""),
            },
        )

        response.raise_for_status()
        response_data = response.json()

        # Extract workflow ID from response
        workflow_id = response_data.get("workflowId") or response_data.get("data", {}).get(
            "workflowId"
        )

        if not workflow_id:
            raise KadoaSdkException(
                ERROR_MESSAGES["NO_WORKFLOW_ID"],
                code=KadoaErrorCode.INTERNAL_ERROR,
                details={"urls": urls},
            )

        return workflow_id

    except ApiException as error:
        raise wrap_kadoa_error(
            error, "Failed to create workflow", {"urls": urls, "entity": entity, "name": name}
        )
    except Exception as error:
        raise wrap_kadoa_error(
            error, "Failed to create workflow", {"urls": urls, "entity": entity, "name": name}
        )


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
    # Make direct HTTP call to bypass pydantic validation issues
    try:
        import json

        response = sdk.session.get(
            f"{sdk.base_url}/v4/workflows/{workflow_id}",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": sdk.configuration.api_key.get("ApiKeyAuth", ""),
            },
        )

        response.raise_for_status()
        data = response.json()

        # Handle nested data structure if present
        if "data" in data:
            data = data["data"]

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
        )


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

        # Check for status changes
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

        # Check if workflow reached terminal state
        if workflow_status.is_terminal():
            return workflow_status

        # Wait before next check
        time.sleep(polling_interval_sec)

    # Timeout occurred
    raise KadoaSdkException(
        f"Extraction did not complete within {max_wait_time / 1000} seconds",
        code=KadoaErrorCode.TIMEOUT,
        details={"workflow_id": workflow_id, "max_wait_time": max_wait_time},
    )
