import json
from unittest.mock import Mock

import pytest

import kadoa_sdk.extraction.services.extraction_builder_service as builder_module
import kadoa_sdk.extraction.services.workflow_manager_service as manager_module
from kadoa_sdk.core.exceptions import KadoaHttpError
from kadoa_sdk.extraction.services.extraction_builder_service import ExtractionBuilderService
from kadoa_sdk.extraction.services.workflow_manager_service import WorkflowManagerService
from kadoa_sdk.extraction.types import ExtractionOptions
from kadoa_sdk.workflows.workflows_core_service import (
    CreateWorkflowInput,
    WorkflowsCoreService,
)


class RawResponse:
    def __init__(self, body: dict, status: int = 200) -> None:
        self.body = body
        self.status = status
        self.released = False

    def read(self) -> bytes:
        return json.dumps(self.body).encode()

    def release_conn(self) -> None:
        self.released = True


@pytest.mark.unit
def test_high_level_workflow_creation_uses_current_generated_request(monkeypatch):
    api = Mock()
    api.v4_workflows_post.return_value = Mock(workflow_id="workflow-id")
    monkeypatch.setattr(manager_module, "get_workflows_api", lambda _client: api)

    service = WorkflowManagerService(Mock())
    workflow_id = service.create_workflow(
        entity=None,
        fields=[],
        config=ExtractionOptions(urls=["https://example.com"]),
    )

    assert workflow_id == "workflow-id"
    request = api.v4_workflows_post.call_args.kwargs["public_workflow_create_request"]
    assert request.urls == ["https://example.com"]


@pytest.mark.unit
def test_core_workflow_creation_uses_current_generated_request(monkeypatch):
    api = Mock()
    api.v4_workflows_post.return_value = Mock(workflow_id="workflow-id")
    service = WorkflowsCoreService(Mock())
    monkeypatch.setattr(
        WorkflowsCoreService,
        "workflows_api",
        property(lambda _self: api),
    )

    result = service.create(
        CreateWorkflowInput(
            urls=["https://example.com"],
            user_prompt="extract all products from this page",
        )
    )

    assert result.id == "workflow-id"
    request = api.v4_workflows_post.call_args.kwargs["public_workflow_create_request"]
    assert request.urls == ["https://example.com"]


@pytest.mark.unit
def test_workflow_list_preserves_unknown_schema_data_types(monkeypatch):
    raw_response = RawResponse(
        {
            "workflows": [
                {
                    "id": "workflow-id",
                    "name": "Job workflow",
                    "state": "DRAFT",
                    "displayState": "VALIDATING",
                    "schema": [
                        {
                            "name": "job_description",
                            "description": "Structured description",
                            "dataType": "JOB_DESCRIPTION",
                        }
                    ],
                }
            ],
            "pagination": {"totalCount": 1, "page": 1, "totalPages": 1, "limit": 100},
        }
    )
    api = Mock()
    api.v4_workflows_get_without_preload_content.return_value = raw_response
    service = WorkflowsCoreService(Mock())
    monkeypatch.setattr(
        WorkflowsCoreService,
        "workflows_api",
        property(lambda _self: api),
    )

    workflows = service.list()

    assert workflows[0].var_schema[0].data_type == "JOB_DESCRIPTION"
    assert workflows[0].state == "DRAFT"
    assert workflows[0].display_state == "VALIDATING"
    assert raw_response.released is True


@pytest.mark.unit
def test_workflow_get_preserves_non_string_schema_examples(monkeypatch):
    raw_response = RawResponse(
        {
            "id": "workflow-id",
            "name": "Product workflow",
            "state": "ACTIVE",
            "displayState": "VALIDATING",
            "entity": "Product",
            "schema": [
                {
                    "name": "price",
                    "description": "Product price",
                    "dataType": "MONEY",
                    "example": 155,
                }
            ],
        }
    )
    api = Mock()
    api.v4_workflows_workflow_id_get_without_preload_content.return_value = raw_response
    service = WorkflowsCoreService(Mock())
    monkeypatch.setattr(
        WorkflowsCoreService,
        "workflows_api",
        property(lambda _self: api),
    )

    workflow = service.get("workflow-id")

    assert workflow.var_schema[0].example == 155
    assert workflow.display_state == "VALIDATING"
    assert workflow.entity == "Product"
    assert raw_response.released is True


@pytest.mark.unit
def test_extraction_pollers_use_the_relaxed_workflow_facade(monkeypatch):
    workflow = Mock(run_state="FINISHED")
    client = Mock()
    client.workflow.get.return_value = workflow
    monkeypatch.setattr(manager_module, "get_workflows_api", Mock())
    monkeypatch.setattr(builder_module, "get_workflows_api", Mock())

    assert WorkflowManagerService(client).get_workflow_status("workflow-id") is workflow
    assert ExtractionBuilderService(client)._get_workflow_status("workflow-id") is workflow
    assert client.workflow.get.call_count == 2


@pytest.mark.unit
def test_workflow_get_preserves_http_errors(monkeypatch):
    raw_response = RawResponse({"error": "Workflow not found"}, status=404)
    api = Mock()
    api.v4_workflows_workflow_id_get_without_preload_content.return_value = raw_response
    service = WorkflowsCoreService(Mock())
    monkeypatch.setattr(
        WorkflowsCoreService,
        "workflows_api",
        property(lambda _self: api),
    )

    with pytest.raises(KadoaHttpError) as exc_info:
        service.get("missing-workflow")

    assert exc_info.value.http_status == 404
    assert exc_info.value.response_body == {"error": "Workflow not found"}
    assert raw_response.released is True
