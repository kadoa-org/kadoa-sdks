import json
from unittest.mock import Mock

import pytest

import kadoa_sdk.extraction.services.extraction_builder_service as builder_module
import kadoa_sdk.extraction.services.workflow_manager_service as manager_module
from kadoa_sdk.core.exceptions import KadoaHttpError
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

    service = manager_module.WorkflowManagerService(Mock())
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
    assert "limit" not in request.to_dict()
    assert "additionalData" not in request.to_dict()


@pytest.mark.unit
@pytest.mark.parametrize(
    ("input", "expected"),
    [
        (
            CreateWorkflowInput(
                urls=["https://example.com"],
                schema_id="schema-id",
            ),
            {"schema_id": "schema-id"},
        ),
        (
            CreateWorkflowInput(
                urls=["https://example.com"],
                entity="Product",
                fields=[
                    {
                        "name": "title",
                        "description": "Product title",
                        "fieldType": "SCHEMA",
                        "dataType": "STRING",
                        "example": "Desk",
                    }
                ],
            ),
            {"entity": "Product"},
        ),
    ],
)
def test_core_workflow_creation_preserves_schema_guidance(monkeypatch, input, expected):
    api = Mock()
    api.v4_workflows_post.return_value = Mock(workflow_id="workflow-id")
    service = WorkflowsCoreService(Mock())
    monkeypatch.setattr(
        WorkflowsCoreService,
        "workflows_api",
        property(lambda _self: api),
    )

    result = service.create(input)

    assert result.id == "workflow-id"
    request = api.v4_workflows_post.call_args.kwargs["public_workflow_create_request"]
    assert request.user_prompt
    for field, value in expected.items():
        assert getattr(request, field) == value
    if input.fields:
        assert request.to_dict()["fields"][0]["name"] == "title"


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
@pytest.mark.parametrize("status", [401, 500])
def test_workflow_list_preserves_http_errors(monkeypatch, status):
    raw_response = RawResponse({"error": "Failed to list workflows"}, status=status)
    api = Mock()
    api.v4_workflows_get_without_preload_content.return_value = raw_response
    service = WorkflowsCoreService(Mock())
    monkeypatch.setattr(
        WorkflowsCoreService,
        "workflows_api",
        property(lambda _self: api),
    )

    with pytest.raises(KadoaHttpError) as exc_info:
        service.list()

    assert exc_info.value.http_status == status
    assert exc_info.value.response_body == {"error": "Failed to list workflows"}
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
@pytest.mark.parametrize("response_type", ["list", "detail"])
def test_relaxed_workflow_schema_preserves_generated_serialization(monkeypatch, response_type):
    workflow_payload = {
        "id": "workflow-id",
        "name": "Product workflow",
        "state": "DRAFT",
        "displayState": "VALIDATING",
        "schema": [
            {
                "description": "Product price",
                "dataType": "JOB_DESCRIPTION",
                "example": 155,
            }
        ],
    }
    raw_response = RawResponse(
        {"workflows": [workflow_payload]} if response_type == "list" else workflow_payload
    )
    api = Mock()
    if response_type == "list":
        api.v4_workflows_get_without_preload_content.return_value = raw_response
    else:
        api.v4_workflows_workflow_id_get_without_preload_content.return_value = raw_response
    service = WorkflowsCoreService(Mock())
    monkeypatch.setattr(
        WorkflowsCoreService,
        "workflows_api",
        property(lambda _self: api),
    )

    workflow = service.list()[0] if response_type == "list" else service.get("workflow-id")

    serialized = workflow.to_dict()
    assert serialized["schema"] == [
        {
            "description": "Product price",
            "example": 155,
            "dataType": "JOB_DESCRIPTION",
        }
    ]


@pytest.mark.unit
def test_extraction_pollers_use_the_relaxed_workflow_facade(monkeypatch):
    workflow = Mock(run_state="FINISHED")
    client = Mock()
    client.workflow.get.return_value = workflow
    monkeypatch.setattr(manager_module, "get_workflows_api", Mock())
    monkeypatch.setattr(builder_module, "get_workflows_api", Mock())

    assert (
        manager_module.WorkflowManagerService(client).get_workflow_status("workflow-id") is workflow
    )
    assert (
        builder_module.ExtractionBuilderService(client)._get_workflow_status("workflow-id")
        is workflow
    )
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


@pytest.mark.unit
def test_python_workflow_creation_forwards_template_user_prompt(monkeypatch):
    api = Mock()
    api.v4_workflows_post.return_value = Mock(workflow_id="workflow-id")
    service = WorkflowsCoreService(Mock())
    monkeypatch.setattr(WorkflowsCoreService, "workflows_api", property(lambda _self: api))

    service.create(
        CreateWorkflowInput(
            urls=["https://example.de/jobs"],
            template_id="11111111-1111-4111-8111-111111111111",
            template_version=2,
            user_prompt="Only include German-language listings",
        )
    )

    request = api.v4_workflows_post.call_args.kwargs["public_workflow_create_request"]
    payload = request.to_dict()
    assert str(payload["templateId"]) == "11111111-1111-4111-8111-111111111111"
    assert payload["templateVersion"] == 2
    assert payload["userPrompt"] == "Only include German-language listings"


@pytest.mark.unit
def test_python_template_only_creation_omits_user_prompt(monkeypatch):
    api = Mock()
    api.v4_workflows_post.return_value = Mock(workflow_id="workflow-id")
    service = WorkflowsCoreService(Mock())
    monkeypatch.setattr(WorkflowsCoreService, "workflows_api", property(lambda _self: api))

    service.create(
        CreateWorkflowInput(
            urls=["https://example.de/jobs"],
            template_id="11111111-1111-4111-8111-111111111111",
        )
    )

    payload = api.v4_workflows_post.call_args.kwargs["public_workflow_create_request"].to_dict()
    assert str(payload["templateId"]) == "11111111-1111-4111-8111-111111111111"
    assert "userPrompt" not in payload
