"""
E2E tests for extraction builder functionality matching Node.js structure.
"""

import time

import pytest

from kadoa_sdk.extraction.types import ExtractOptions, RunWorkflowOptions
from kadoa_sdk.notifications.notification_setup_service import NotificationOptions
from kadoa_sdk.schemas.schema_builder import FieldOptions
from tests.utils.cleanup_helpers import delete_workflow_by_name


@pytest.mark.e2e
class TestExtractionBuilder:
    """E2E tests for extraction builder functionality."""

    @pytest.mark.integration
    @pytest.mark.timeout(700)
    @pytest.mark.asyncio
    async def test_auto_detection_no_extraction_parameter(self, realtime_client):
        """Auto-detection (no extraction parameter)."""
        workflow_name = f"Auto Detection Test {int(time.time() * 1000)}"
        delete_workflow_by_name(workflow_name, realtime_client)

        created_extraction = (
            realtime_client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name=workflow_name,
                )
            )
            .with_notifications(
                NotificationOptions(
                    events="all",
                    channels={"WEBSOCKET": True},
                )
            )
            .bypass_preview()
            .set_location({"type": "auto"})
            .set_interval({"interval": "ONLY_ONCE"})
            .create()
        )

        assert created_extraction is not None
        assert created_extraction.workflow_id is not None

        result = created_extraction.run(RunWorkflowOptions(variables={}, limit=5))
        data = result.fetch_data({"limit": 5})

        assert data is not None
        assert len(data.data) == 5

        if created_extraction.workflow_id:
            realtime_client.workflow.delete(created_extraction.workflow_id)

    @pytest.mark.skip(reason="Matching Node.js test.skip")
    @pytest.mark.integration
    @pytest.mark.timeout(700)
    @pytest.mark.asyncio
    async def test_raw_extraction_markdown_only(self, realtime_client):
        """Raw extraction (markdown only)."""
        workflow_name = f"Raw Markdown Extraction {int(time.time() * 1000)}"
        delete_workflow_by_name(workflow_name, realtime_client)

        created_extraction = (
            realtime_client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name=workflow_name,
                    extraction=lambda builder: builder.raw("MARKDOWN"),
                )
            )
            .bypass_preview()
            .set_interval({"interval": "ONLY_ONCE"})
            .create()
        )

        assert created_extraction is not None
        assert created_extraction.workflow_id is not None

        result = created_extraction.run(RunWorkflowOptions(variables={}, limit=1))
        data = result.fetch_data({"limit": 1})

        assert data is not None
        assert len(data.data) == 1
        # Check that we have the raw markdown field
        assert "rawMarkdown" in data.data[0]

        if created_extraction.workflow_id:
            realtime_client.workflow.delete(created_extraction.workflow_id)

    # Covered by docs_snippets: PY-WORKFLOWS-003, PY-INTRODUCTION-002, PY-SCHEMAS-001
    # Covered by docs_snippets: PY-WORKFLOWS-004 (hybrid/raw)
    # Covered by docs_snippets: PY-WORKFLOWS-005 (classification)

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    @pytest.mark.asyncio
    async def test_extraction_builder_with_additional_data(self, realtime_client):
        """Extraction builder with additionalData."""
        workflow_name = f"Extraction Builder Additional Data Test {int(time.time() * 1000)}"
        delete_workflow_by_name(workflow_name, realtime_client)

        test_data = {
            "sourceSystem": "e2e-test",
            "metadata": {"version": 1, "testRun": True},
        }

        created_extraction = (
            realtime_client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name=workflow_name,
                    extraction=lambda builder: builder.entity("Product").field(
                        "title",
                        "Product name",
                        "STRING",
                        FieldOptions(example="Example Product"),
                    ),
                    additional_data=test_data,
                )
            )
            .bypass_preview()
            .set_interval({"interval": "ONLY_ONCE"})
            .create()
        )

        assert created_extraction is not None
        assert created_extraction.workflow_id is not None

        # Verify additionalData is persisted
        workflow = realtime_client.workflow.get(created_extraction.workflow_id)
        workflow_additional_data = (
            getattr(workflow, "additional_data", None)
            or getattr(workflow, "additionalData", None)
        )
        assert workflow_additional_data is not None
        assert workflow_additional_data.get("sourceSystem") == "e2e-test"
        metadata = workflow_additional_data.get("metadata")
        assert metadata is not None
        assert metadata.get("version") == 1
        assert metadata.get("testRun") is True

        if created_extraction.workflow_id:
            realtime_client.workflow.delete(created_extraction.workflow_id)
