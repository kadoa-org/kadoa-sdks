from __future__ import annotations

import json
import time
from urllib.parse import urlparse
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from kadoa_sdk.core.logger import workflow as logger

from ..extraction_acl import (
    ClassificationField,
    CreateWorkflowBody,
    DataField,
    DataFieldExample,
    GetWorkflowResponse,
    RawContentField,
    SchemaResponseSchemaInner,
    V4WorkflowsWorkflowIdGet200Response,
    WorkflowWithEntityAndFields,
)

if TYPE_CHECKING:  # pragma: no cover
    from ...client import KadoaClient
from ...core.exceptions import KadoaErrorCode, KadoaHttpError, KadoaSdkError
from ...core.http import get_workflows_api
from ...core.utils import PollingOptions, poll_until
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
        self._logger = logger

    def _validate_additional_data(self, additional_data: Optional[Dict[str, Any]]) -> None:
        if additional_data is None:
            return

        if not isinstance(additional_data, dict):
            raise KadoaSdkError(
                "additional_data must be a dictionary", code=KadoaErrorCode.VALIDATION_ERROR
            )

        try:
            serialized = json.dumps(additional_data)
            if len(serialized) > 100 * 1024:
                self._logger.warning(
                    "[Kadoa SDK] additional_data exceeds 100KB, consider reducing size"
                )
        except (TypeError, ValueError):
            raise KadoaSdkError(
                "additional_data must be JSON-serializable", code=KadoaErrorCode.VALIDATION_ERROR
            )

    def is_terminal_run_state(self, run_state: Optional[str]) -> bool:
        return bool(run_state and run_state.upper() in TERMINAL_RUN_STATES)

    def create_workflow(
        self, *, entity: str, fields: List[Dict[str, Any]], config: ExtractionOptions
    ) -> str:
        self._validate_additional_data(config.additional_data)

        api = get_workflows_api(self.client)

        domain_name = urlparse(config.urls[0]).hostname
        schema_fields = []
        for field in fields:
            if isinstance(field, SchemaResponseSchemaInner):
                schema_fields.append(field)
            elif isinstance(field, (DataField, ClassificationField, RawContentField)):
                schema_fields.append(SchemaResponseSchemaInner(actual_instance=field))
            elif isinstance(field, dict):
                field_type = field.get("fieldType") or field.get("field_type")
                if field_type == "CLASSIFICATION":
                    field_obj = ClassificationField(**field)
                elif field_type == "METADATA":
                    field_obj = RawContentField(**field)
                else:
                    field_dict = dict(field)
                    if "example" in field_dict and field_dict["example"] is not None:
                        example_value = field_dict.pop("example")
                        if isinstance(example_value, (str, list)):
                            field_dict["example"] = DataFieldExample(actual_instance=example_value)
                        else:
                            field_dict["example"] = example_value
                    field_obj = DataField(**field_dict)
                schema_fields.append(SchemaResponseSchemaInner(actual_instance=field_obj))
            else:
                if hasattr(field, "model_dump"):
                    field_dict = field.model_dump()
                    field_type = field_dict.get("fieldType") or field_dict.get("field_type")
                    if field_type == "CLASSIFICATION":
                        field_obj = ClassificationField(**field_dict)
                    elif field_type == "METADATA":
                        field_obj = RawContentField(**field_dict)
                    else:
                        field_obj = DataField(**field_dict)
                    schema_fields.append(SchemaResponseSchemaInner(actual_instance=field_obj))
                else:
                    field_dict = dict(field) if hasattr(field, "__dict__") else field
                    field_obj = DataField(**field_dict)
                    schema_fields.append(SchemaResponseSchemaInner(actual_instance=field_obj))

        inner = WorkflowWithEntityAndFields(
            urls=config.urls,
            navigation_mode=(config.navigation_mode or DEFAULTS["navigation_mode"]),
            entity=entity,
            name=(config.name or domain_name),
            fields=schema_fields,
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
                raise KadoaSdkError(
                    KadoaSdkError.ERROR_MESSAGES["NO_WORKFLOW_ID"],
                    code=KadoaErrorCode.INTERNAL_ERROR,
                    details={
                        "response": resp.model_dump() if hasattr(resp, "model_dump") else resp
                    },
                )
            return workflow_id
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message=KadoaSdkError.ERROR_MESSAGES["WORKFLOW_CREATE_FAILED"],
                details={"entity": entity, "fields": fields},
            )

    def get_workflow_status(self, workflow_id: str) -> GetWorkflowResponse:
        api = get_workflows_api(self.client)
        try:
            resp = api.v4_workflows_workflow_id_get(workflow_id=workflow_id)
            return GetWorkflowResponse.from_generated(resp)
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message=KadoaSdkError.ERROR_MESSAGES["PROGRESS_CHECK_FAILED"],
                details={"workflowId": workflow_id},
            )

    def wait_for_workflow_completion(
        self,
        workflow_id: str,
        polling_interval: float,
        max_wait_time: float,
    ) -> GetWorkflowResponse:
        """Wait for workflow to complete using polling utility"""
        start = time.time()
        last_status: Optional[GetWorkflowResponse] = None
        self._logger.debug(
            "poll start: id=%s intervalSec=%s maxWaitSec=%s",
            workflow_id,
            polling_interval,
            max_wait_time,
        )

        def poll_fn() -> GetWorkflowResponse:
            nonlocal last_status
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
            last_status = current
            return current

        def is_complete(workflow: GetWorkflowResponse) -> bool:
            if self.is_terminal_run_state(workflow.run_state):
                self._logger.debug(
                    "terminal: id=%s state=%s runState=%s",
                    workflow_id,
                    workflow.state,
                    workflow.run_state,
                )
                return True
            return False

        polling_options = PollingOptions(
            poll_interval_ms=int(polling_interval * 1000),
            timeout_ms=int(max_wait_time * 1000),
        )

        try:
            result = poll_until(poll_fn, is_complete, polling_options)
            return result.result
        except KadoaSdkError as e:
            if e.code == KadoaErrorCode.TIMEOUT:
                self._logger.warning(
                    "timeout: id=%s lastState=%s lastRunState=%s waitedSec=%.2f",
                    workflow_id,
                    getattr(last_status, "state", None) if last_status else None,
                    getattr(last_status, "run_state", None) if last_status else None,
                    (time.time() - start),
                )
                raise KadoaSdkError(
                    KadoaSdkError.ERROR_MESSAGES["WORKFLOW_TIMEOUT"],
                    code=KadoaErrorCode.TIMEOUT,
                    details={"workflowId": workflow_id, "maxWaitTime": max_wait_time},
                )
            raise
