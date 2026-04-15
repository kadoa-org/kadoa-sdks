from unittest.mock import Mock

import pytest

from kadoa_sdk.extraction.extraction_acl import GetWorkflowResponse
from kadoa_sdk.extraction.extraction_module import ExtractionModule
from kadoa_sdk.extraction.types import ExtractionOptions


@pytest.mark.unit
def test_run_defaults_to_agentic_navigation_without_entity_detection():
    client = Mock()
    module = ExtractionModule(client)
    module.entity_detector = Mock()
    module.workflow_manager = Mock()
    module.data_fetcher = Mock()

    module.workflow_manager.create_workflow.return_value = "wf-123"
    module.workflow_manager.wait_for_workflow_completion.return_value = GetWorkflowResponse(
        run_state="FINISHED",
        state="ACTIVE",
    )
    module.data_fetcher.fetch_data.return_value = Mock(
        data=[{"title": "Example"}],
        pagination={"page": 1, "total_pages": 1, "total_count": 1, "limit": 100},
    )

    result = module.run(ExtractionOptions(urls=["https://example.com"]))

    module.entity_detector.fetch_entity_fields.assert_not_called()
    module.workflow_manager.create_workflow.assert_called_once()
    kwargs = module.workflow_manager.create_workflow.call_args.kwargs
    assert kwargs["entity"] is None
    assert kwargs["fields"] == []
    assert kwargs["config"].navigation_mode == "agentic-navigation"
    assert kwargs["config"].user_prompt == "extract all the data for the main entity of this page"
    assert result.workflow_id == "wf-123"


@pytest.mark.unit
def test_submit_defaults_to_agentic_navigation_without_entity_detection():
    client = Mock()
    module = ExtractionModule(client)
    module.entity_detector = Mock()
    module.workflow_manager = Mock()

    module.workflow_manager.create_workflow.return_value = "wf-submit"

    import kadoa_sdk.core.http as http_module

    original_get_api = http_module.get_workflows_api
    mock_api = Mock()
    mock_api.v4_workflows_workflow_id_run_put.return_value = Mock()
    http_module.get_workflows_api = lambda _client: mock_api

    try:
        result = module.submit(ExtractionOptions(urls=["https://example.com"]))
    finally:
        http_module.get_workflows_api = original_get_api

    module.entity_detector.fetch_entity_fields.assert_not_called()
    kwargs = module.workflow_manager.create_workflow.call_args.kwargs
    assert kwargs["entity"] is None
    assert kwargs["fields"] == []
    assert kwargs["config"].navigation_mode == "agentic-navigation"
    assert kwargs["config"].user_prompt == "extract all the data for the main entity of this page"
    assert result.workflow_id == "wf-submit"


@pytest.mark.unit
def test_submit_preserves_explicit_user_prompt():
    client = Mock()
    module = ExtractionModule(client)
    module.entity_detector = Mock()
    module.workflow_manager = Mock()

    module.workflow_manager.create_workflow.return_value = "wf-submit"

    import kadoa_sdk.core.http as http_module

    original_get_api = http_module.get_workflows_api
    mock_api = Mock()
    mock_api.v4_workflows_workflow_id_run_put.return_value = Mock()
    http_module.get_workflows_api = lambda _client: mock_api

    try:
        module.submit(
            ExtractionOptions(
                urls=["https://example.com"],
                user_prompt="extract only highlighted items",
            )
        )
    finally:
        http_module.get_workflows_api = original_get_api

    kwargs = module.workflow_manager.create_workflow.call_args.kwargs
    assert kwargs["config"].user_prompt == "extract only highlighted items"
