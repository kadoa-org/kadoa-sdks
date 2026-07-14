import json
from unittest.mock import Mock

import pytest

import kadoa_sdk.extraction.services.workflow_manager_service as manager_module
from kadoa_sdk.extraction.services.workflow_manager_service import WorkflowManagerService
from kadoa_sdk.extraction.types import ExtractionOptions
from kadoa_sdk.workflows.workflows_core_service import (
    CreateWorkflowInput,
    WorkflowsCoreService,
)


class RawResponse:
    def __init__(self, body: dict) -> None:
        self.body = body
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
    assert raw_response.released is True
