from __future__ import annotations

import json
from typing import TYPE_CHECKING, List

if TYPE_CHECKING:  # pragma: no cover
    from ...client import KadoaClient
from ...core.exceptions import KadoaHttpException, KadoaSdkException
from ...core.http import get_workflows_api


class DataFetcherService:
    def __init__(self, client: "KadoaClient") -> None:
        self.client = client

    def fetch_workflow_data(self, workflow_id: str, limit: int) -> List[dict]:
        api = get_workflows_api(self.client)
        try:
            resp = api.v4_workflows_workflow_id_data_get(workflow_id=workflow_id, limit=limit)
            container = getattr(resp, "data", resp)
            # If container is list
            if isinstance(container, list):
                return container
            # If container has .data list
            inner = getattr(container, "data", None)
            if isinstance(inner, list):
                return inner
            # If container is dict with data key
            if isinstance(container, dict) and isinstance(container.get("data"), list):
                return container["data"]
            # Fallback: raw GET
            from openapi_client.rest import RESTClientObject

            rest = RESTClientObject(self.client.configuration)
            url = f"{self.client.configuration.host}/v4/workflows/{workflow_id}/data?limit={limit}"
            headers = {"Accept": "application/json"}
            api_key = getattr(self.client.configuration, "api_key", None)
            if isinstance(api_key, dict) and api_key.get("ApiKeyAuth"):
                headers["x-api-key"] = api_key["ApiKeyAuth"]
            response = rest.request("GET", url, headers=headers)
            parsed = json.loads(response.read())
            if isinstance(parsed, list):
                return parsed
            if isinstance(parsed, dict) and isinstance(parsed.get("data"), list):
                return parsed["data"]
            return []
        except Exception as error:
            raise KadoaHttpException.wrap(
                error,
                message=KadoaSdkException.ERROR_MESSAGES["DATA_FETCH_FAILED"],
                details={"workflowId": workflow_id, "limit": limit},
            )
