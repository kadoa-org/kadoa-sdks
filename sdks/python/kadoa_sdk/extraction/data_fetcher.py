"""
Data fetching functionality for extraction workflows.
"""

from typing import List, Dict, Any, Optional

from kadoa_sdk.kadoa_sdk import KadoaSdk
from kadoa_sdk.exceptions import wrap_kadoa_error
from kadoa_sdk.extraction.client import get_workflows_api
from kadoa_sdk.extraction.constants import DEFAULT_OPTIONS, ERROR_MESSAGES
from openapi_client import ApiException

def fetch_workflow_data(
    sdk: KadoaSdk, workflow_id: str, limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Fetch extracted data from a workflow.

    Args:
        sdk: The KadoaSdk instance
        workflow_id: The workflow ID to fetch data from
        limit: Maximum number of records to retrieve

    Returns:
        List of extracted data dictionaries

    Raises:
        KadoaSdkException: If data fetch fails
    """
    workflows_api = get_workflows_api(sdk)

    if limit is None:
        limit = DEFAULT_OPTIONS["data_limit"]

    try:
        response = workflows_api.v4_workflows_workflow_id_data_get(
            workflow_id=workflow_id, limit=limit
        )

        # Extract data from response
        if hasattr(response, "data") and hasattr(response.data, "data"):
            data = response.data.data
        elif hasattr(response, "data"):
            data = response.data
        else:
            data = []

        # Convert to list of dicts if necessary
        if data is None:
            return []

        # If data is a list of objects, convert to dicts
        result = []
        for item in data:
            if hasattr(item, "to_dict"):
                result.append(item.to_dict())
            elif isinstance(item, dict):
                result.append(item)
            else:
                # Try to convert to dict
                try:
                    result.append(dict(item))
                except Exception:
                    result.append({"raw": str(item)})

        return result

    except ApiException as error:
        raise wrap_kadoa_error(
            error, ERROR_MESSAGES["DATA_FETCH_FAILED"], {"workflow_id": workflow_id, "limit": limit}
        )
    except Exception as error:
        raise wrap_kadoa_error(
            error, ERROR_MESSAGES["DATA_FETCH_FAILED"], {"workflow_id": workflow_id, "limit": limit}
        )
