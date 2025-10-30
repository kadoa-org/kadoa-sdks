from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional, Dict, Any
import logging
import json

from openapi_client.models.create_workflow_body import CreateWorkflowBody
from openapi_client.models.create_workflow_with_custom_schema_body import CreateWorkflowWithCustomSchemaBody
from openapi_client.models.v4_workflows_workflow_id_get200_response import (
    V4WorkflowsWorkflowIdGet200Response,
)

if TYPE_CHECKING:  # pragma: no cover
    from ...client import KadoaClient
from ...core.exceptions import KadoaHttpException, KadoaSdkException
from ...core.http import get_workflows_api
from ..types import DEFAULTS, ExtractionOptions

TERMINAL_RUN_STATES = {
    "FINISHED",
    "SUCCESS",
    "FAILED",
    "ERROR",
    "STOPPED",
    "CANCELLED",
}


class WorkflowManagerService:
    def __init__(self, client: "KadoaClient") -> None:
        self.client = client
        self._logger = logging.getLogger("kadoa_sdk.polling")

    def _auth_headers(self) -> dict:
        headers: dict = {}
        config = self.client.configuration
        api_key = getattr(config, "api_key", None)
        if isinstance(api_key, dict):
            key = api_key.get("ApiKeyAuth")
            if key:
                headers["x-api-key"] = key
        return headers

    def _validate_additional_data(self, additional_data: Optional[Dict[str, Any]]) -> None:
        if additional_data is None:
            return
        
        if not isinstance(additional_data, dict):
            raise KadoaSdkException(
                "additional_data must be a dictionary",
                code="VALIDATION_ERROR"
            )
        
        try:
            serialized = json.dumps(additional_data)
            if len(serialized) > 100 * 1024:
                self._logger.warning(
                    "[Kadoa SDK] additional_data exceeds 100KB, consider reducing size"
                )
        except (TypeError, ValueError):
            raise KadoaSdkException(
                "additional_data must be JSON-serializable",
                code="VALIDATION_ERROR"
            )

    def is_terminal_run_state(self, run_state: Optional[str]) -> bool:
        return bool(run_state and run_state.upper() in TERMINAL_RUN_STATES)

    def create_workflow(self, *, entity: str, fields: List[dict], config: ExtractionOptions) -> str:
        self._validate_additional_data(config.additional_data)
        
        api = get_workflows_api(self.client)
        inner = CreateWorkflowWithCustomSchemaBody(
            urls=config.urls,
            navigation_mode=(config.navigation_mode or DEFAULTS["navigation_mode"]),
            entity=entity,
            name=(config.name or DEFAULTS["name"]),
            fields=fields,
            location=config.location,
            bypass_preview=True,
            limit=(config.max_records or DEFAULTS["max_records"]),
            tags=["sdk"],
            additional_data=config.additional_data,
        )
        try:
            wrapper = CreateWorkflowBody(inner)
            resp = api.v4_workflows_post(create_workflow_body=wrapper)
            workflow_id = getattr(resp, "workflow_id", None) or getattr(resp, "workflowId", None)
            if not workflow_id:
                raise KadoaSdkException(
                    KadoaSdkException.ERROR_MESSAGES["NO_WORKFLOW_ID"],
                    code="INTERNAL_ERROR",
                    details={
                        "response": resp.model_dump() if hasattr(resp, "model_dump") else resp
                    },
                )
            return workflow_id
        except Exception as error:
            raise KadoaHttpException.wrap(
                error,
                message=KadoaSdkException.ERROR_MESSAGES["WORKFLOW_CREATE_FAILED"],
                details={"entity": entity, "fields": fields},
            )

    def get_workflow_status(self, workflow_id: str) -> V4WorkflowsWorkflowIdGet200Response:
        api = get_workflows_api(self.client)
        try:
            resp = api.v4_workflows_workflow_id_get(workflow_id=workflow_id)
            return resp.data
        except Exception:
            try:
                import json

                from openapi_client.rest import RESTClientObject

                rest = RESTClientObject(self.client.configuration)
                url = f"{self.client.configuration.host}/v4/workflows/{workflow_id}"
                response = rest.request(
                    "GET",
                    url,
                    headers={"Accept": "application/json", **self._auth_headers()},
                )
                data = json.loads(response.read())
                self._logger.debug(
                    "fallback status fetch: id=%s state=%s runState=%s",
                    workflow_id,
                    data.get("state"),
                    data.get("runState"),
                )
                obj = V4WorkflowsWorkflowIdGet200Response.model_construct()
                obj.run_state = data.get("runState")
                obj.state = data.get("state")
                return obj
            except Exception as error:
                raise KadoaHttpException.wrap(
                    error,
                    message=KadoaSdkException.ERROR_MESSAGES["PROGRESS_CHECK_FAILED"],
                    details={"workflowId": workflow_id},
                )

    def wait_for_workflow_completion(
        self,
        workflow_id: str,
        polling_interval: float,
        max_wait_time: float,
    ) -> V4WorkflowsWorkflowIdGet200Response:
        import time

        start = time.time()
        last_status: Optional[V4WorkflowsWorkflowIdGet200Response] = None
        self._logger.debug(
            "poll start: id=%s intervalSec=%s maxWaitSec=%s",
            workflow_id,
            polling_interval,
            max_wait_time,
        )
        while (time.time() - start) < max_wait_time:
            current = self.get_workflow_status(workflow_id)
            if (
                last_status is None
                or last_status.state != current.state
                or last_status.run_state != current.run_state
            ):
                self._logger.debug(
                    "status change: id=%s state=%s->%s runState=%s->%s",
                    workflow_id,
                    getattr(last_status, "state", None) if last_status else None,
                    current.state,
                    getattr(last_status, "run_state", None) if last_status else None,
                    current.run_state,
                )
                self.client.emit(
                    "extraction:status_changed",
                    {
                        "workflowId": workflow_id,
                        "previousState": (
                            getattr(last_status, "state", None) if last_status else None
                        ),
                        "previousRunState": (
                            getattr(last_status, "run_state", None) if last_status else None
                        ),
                        "currentState": current.state,
                        "currentRunState": current.run_state,
                    },
                    "extraction",
                )
            if self.is_terminal_run_state(current.run_state):
                self._logger.debug(
                    "terminal: id=%s state=%s runState=%s",
                    workflow_id,
                    current.state,
                    current.run_state,
                )
                return current
            last_status = current
            time.sleep(polling_interval)

        self._logger.warning(
            "timeout: id=%s lastState=%s lastRunState=%s waitedSec=%.2f",
            workflow_id,
            getattr(last_status, "state", None),
            getattr(last_status, "run_state", None),
            (time.time() - start),
        )
        raise KadoaSdkException(
            KadoaSdkException.ERROR_MESSAGES["WORKFLOW_TIMEOUT"],
            code="TIMEOUT",
            details={"workflowId": workflow_id, "maxWaitTime": max_wait_time},
        )
