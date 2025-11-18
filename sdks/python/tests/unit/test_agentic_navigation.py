"""
Unit tests for agentic-navigation validation.
"""

import pytest
from unittest.mock import Mock, MagicMock

from kadoa_sdk.core.exceptions import KadoaSdkError
from kadoa_sdk.extraction.services.extraction_builder_service import (
    ExtractionBuilderService,
)
from kadoa_sdk.extraction.types import ExtractOptions


@pytest.mark.unit
class TestAgenticNavigation:
    """Unit tests for agentic-navigation validation."""

    def test_throws_error_when_user_prompt_is_missing_for_agentic_navigation(self):
        """Should throw error when userPrompt is missing for agentic-navigation."""
        mock_client = Mock()
        mock_client.notification = Mock()
        mock_client.notification.setup = Mock()
        mock_client.notification.setup.setup = Mock()

        # Mock the workflows API
        mock_api = Mock()
        mock_response = Mock()
        mock_response.workflow_id = "test-workflow-id"
        mock_response.workflowId = "test-workflow-id"
        mock_api.v4_workflows_post.return_value = mock_response

        # Mock get_workflows_api to return our mock
        import kadoa_sdk.extraction.services.extraction_builder_service as builder_module
        original_get_api = builder_module.get_workflows_api
        builder_module.get_workflows_api = lambda client: mock_api

        try:
            builder = ExtractionBuilderService(mock_client)

            prepared = builder.extract(
                ExtractOptions(
                    urls=["https://example.com"],
                    name="Test",
                    navigation_mode="agentic-navigation",
                )
            )

            with pytest.raises(KadoaSdkError) as exc_info:
                prepared.create()

            assert "user_prompt is required" in str(exc_info.value).lower()
        finally:
            builder_module.get_workflows_api = original_get_api

    def test_allows_agentic_navigation_when_user_prompt_is_provided(self):
        """Should allow agentic-navigation when userPrompt is provided."""
        mock_client = Mock()
        mock_client.notification = Mock()
        mock_client.notification.setup = Mock()
        mock_client.notification.setup.setup = Mock()

        # Mock the workflows API
        mock_api = Mock()
        mock_response = Mock()
        mock_response.workflow_id = "test-workflow-id"
        mock_response.workflowId = "test-workflow-id"
        mock_api.v4_workflows_post.return_value = mock_response

        # Mock get_workflows_api to return our mock
        import kadoa_sdk.extraction.services.extraction_builder_service as builder_module
        original_get_api = builder_module.get_workflows_api
        builder_module.get_workflows_api = lambda client: mock_api

        try:
            builder = ExtractionBuilderService(mock_client)

            prepared = (
                builder.extract(
                    ExtractOptions(
                        urls=["https://example.com"],
                        name="Test",
                        navigation_mode="agentic-navigation",
                    )
                )
                .with_prompt("Extract all products")
            )

            # Should not throw validation error
            result = prepared.create()
            assert result is not None
            assert result.workflow_id == "test-workflow-id"
        finally:
            builder_module.get_workflows_api = original_get_api

