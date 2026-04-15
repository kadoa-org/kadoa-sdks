from unittest.mock import Mock

import pytest

import kadoa_sdk.extraction.services.extraction_builder_service as builder_module
from kadoa_sdk.extraction.types import ExtractOptions


@pytest.mark.unit
def test_builder_defaults_to_agentic_navigation_with_default_prompt():
    mock_client = Mock()
    mock_client.notification = Mock()
    mock_client.notification.setup = Mock()
    mock_client.notification.setup.setup = Mock()

    mock_api = Mock()
    mock_response = Mock()
    mock_response.workflow_id = "test-workflow-id"
    mock_response.workflowId = "test-workflow-id"
    mock_api.v4_workflows_post.return_value = mock_response

    original_get_api = builder_module.get_workflows_api
    builder_module.get_workflows_api = lambda client: mock_api

    try:
        builder = builder_module.ExtractionBuilderService(mock_client)

        result = (
            builder.extract(
                ExtractOptions(
                    urls=["https://example.com"],
                    name="Test",
                    extraction=lambda schema: schema.entity("Product").field(
                        "title", "Title", "STRING", example="Example Title"
                    ),
                )
            )
            .create()
        )

        assert result is not None
        assert result.workflow_id == "test-workflow-id"
        request = mock_api.v4_workflows_post.call_args.kwargs["create_workflow_body"]
        inner = request.actual_instance
        assert inner.navigation_mode == "agentic-navigation"
        assert (
            inner.user_prompt
            == "extract all Product entities from this page and return these fields: title"
        )
    finally:
        builder_module.get_workflows_api = original_get_api


@pytest.mark.unit
def test_builder_uses_generic_prompt_without_schema():
    mock_client = Mock()
    mock_client.notification = Mock()
    mock_client.notification.setup = Mock()
    mock_client.notification.setup.setup = Mock()

    mock_api = Mock()
    mock_response = Mock()
    mock_response.workflow_id = "test-workflow-id"
    mock_response.workflowId = "test-workflow-id"
    mock_api.v4_workflows_post.return_value = mock_response

    original_get_api = builder_module.get_workflows_api
    builder_module.get_workflows_api = lambda client: mock_api

    try:
        builder = builder_module.ExtractionBuilderService(mock_client)
        builder.extract(ExtractOptions(urls=["https://example.com"], name="Test")).create()

        request = mock_api.v4_workflows_post.call_args.kwargs["create_workflow_body"]
        inner = request.actual_instance
        assert inner.user_prompt == "extract all the data for the main entity of this page"
    finally:
        builder_module.get_workflows_api = original_get_api


@pytest.mark.unit
def test_builder_preserves_explicit_user_prompt():
    mock_client = Mock()
    mock_client.notification = Mock()
    mock_client.notification.setup = Mock()
    mock_client.notification.setup.setup = Mock()

    mock_api = Mock()
    mock_response = Mock()
    mock_response.workflow_id = "test-workflow-id"
    mock_response.workflowId = "test-workflow-id"
    mock_api.v4_workflows_post.return_value = mock_response

    original_get_api = builder_module.get_workflows_api
    builder_module.get_workflows_api = lambda client: mock_api

    try:
        builder = builder_module.ExtractionBuilderService(mock_client)
        builder.extract(
            ExtractOptions(
                urls=["https://example.com"],
                name="Test",
                extraction=lambda schema: schema.entity("Product").field(
                    "title", "Title", "STRING", example="Example Title"
                ),
                user_prompt="extract featured products only",
            )
        ).create()

        request = mock_api.v4_workflows_post.call_args.kwargs["create_workflow_body"]
        inner = request.actual_instance
        assert inner.user_prompt == "extract featured products only"
    finally:
        builder_module.get_workflows_api = original_get_api


@pytest.mark.unit
def test_builder_keeps_raw_fields_on_agentic_navigation():
    mock_client = Mock()
    mock_client.notification = Mock()
    mock_client.notification.setup = Mock()
    mock_client.notification.setup.setup = Mock()

    mock_api = Mock()
    mock_response = Mock()
    mock_response.workflow_id = "test-workflow-id"
    mock_response.workflowId = "test-workflow-id"
    mock_api.v4_workflows_post.return_value = mock_response

    original_get_api = builder_module.get_workflows_api
    builder_module.get_workflows_api = lambda client: mock_api

    try:
        builder = builder_module.ExtractionBuilderService(mock_client)
        builder.extract(
            ExtractOptions(
                urls=["https://example.com"],
                name="Raw Test",
                extraction=lambda schema: schema.raw("MARKDOWN"),
            )
        ).create()

        request = mock_api.v4_workflows_post.call_args.kwargs["create_workflow_body"]
        inner = request.actual_instance
        assert inner.navigation_mode == "agentic-navigation"
        assert inner.user_prompt == "extract all records from this page and return these fields: rawMarkdown"
    finally:
        builder_module.get_workflows_api = original_get_api


@pytest.mark.unit
def test_builder_synthesizes_raw_helper_fields_as_structured_fields():
    mock_client = Mock()
    mock_client.notification = Mock()
    mock_client.notification.setup = Mock()
    mock_client.notification.setup.setup = Mock()

    mock_api = Mock()
    mock_response = Mock()
    mock_response.workflow_id = "test-workflow-id"
    mock_response.workflowId = "test-workflow-id"
    mock_api.v4_workflows_post.return_value = mock_response

    original_get_api = builder_module.get_workflows_api
    builder_module.get_workflows_api = lambda client: mock_api

    try:
        builder = builder_module.ExtractionBuilderService(mock_client)
        builder.extract(
            ExtractOptions(
                urls=["https://example.com"],
                name="Raw Workflow",
                extraction=lambda schema: schema.raw(["MARKDOWN", "PAGE_URL"]),
            )
        ).create()

        request = mock_api.v4_workflows_post.call_args.kwargs["create_workflow_body"]
        inner = request.actual_instance
        assert inner.navigation_mode == "agentic-navigation"
        assert inner.fields[0].actual_instance.data_type == "STRING"
        assert inner.fields[1].actual_instance.data_type == "LINK"
        assert (
            inner.user_prompt
            == "extract all records from this page and return these fields: rawMarkdown, rawPageUrl"
        )
    finally:
        builder_module.get_workflows_api = original_get_api
