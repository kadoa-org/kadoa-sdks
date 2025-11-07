"""
E2E tests for extraction builder functionality matching Node.js structure.
"""

import os

import pytest
import pytest_asyncio

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.extraction.types import ExtractOptions, RunWorkflowOptions
from kadoa_sdk.schemas.schema_builder import FieldOptions
from openapi_client.models.classification_field_categories_inner import (
    ClassificationFieldCategoriesInner,
)


@pytest.mark.e2e
class TestExtractionBuilder:
    """E2E tests for extraction builder functionality."""

    @pytest_asyncio.fixture(scope="class")
    async def client(self):
        """Initialize client for all tests in this class."""
        settings = get_settings()
        base_url = (
            settings.public_api_uri
            if os.getenv("KADOA_PUBLIC_API_URI")
            else "http://localhost:12380"
        )
        client = KadoaClient(
            KadoaClientConfig(
                api_key=settings.api_key,
                base_url=base_url,
                timeout=30,
                enable_realtime=True,
            )
        )

        yield client

        client.dispose()

    @pytest.mark.integration
    @pytest.mark.timeout(700)
    @pytest.mark.asyncio
    async def test_auto_detection_no_extraction_parameter(self, client):
        """Auto-detection (no extraction parameter)."""
        created_extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Auto Detection Test",
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

    @pytest.mark.integration
    @pytest.mark.timeout(700)
    @pytest.mark.asyncio
    async def test_raw_extraction_markdown_only(self, client):
        """Raw extraction (markdown only)."""
        created_extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Raw Markdown Extraction",
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

    @pytest.mark.integration
    @pytest.mark.timeout(700)
    @pytest.mark.asyncio
    async def test_custom_schema_with_fields(self, client):
        """Custom schema with fields."""
        created_extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Custom Schema Test",
                    extraction=lambda builder: builder.entity("Product")
                    .field(
                        "title",
                        "Product name",
                        "STRING",
                        FieldOptions(example="Example Product"),
                    )
                    .field("price", "Product price", "MONEY"),
                )
            )
            .bypass_preview()
            .set_interval({"interval": "ONLY_ONCE"})
            .create()
        )

        assert created_extraction is not None
        assert created_extraction.workflow_id is not None

        result = created_extraction.run(RunWorkflowOptions(variables={}, limit=5))
        data = result.fetch_data({"limit": 5})

        assert data is not None
        assert len(data.data) == 5
        # Check that we have the defined fields
        assert "title" in data.data[0]
        assert "price" in data.data[0]

    @pytest.mark.integration
    @pytest.mark.timeout(700)
    @pytest.mark.asyncio
    async def test_hybrid_extraction_schema_raw_content(self, client):
        """Hybrid extraction (schema + raw content)."""
        created_extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Hybrid Extraction Test",
                    extraction=lambda builder: builder.entity("Product")
                    .field(
                        "title",
                        "Product name",
                        "STRING",
                        FieldOptions(example="Example Product"),
                    )
                    .field("price", "Product price", "MONEY")
                    .raw("HTML"),
                )
            )
            .bypass_preview()
            .set_interval({"interval": "ONLY_ONCE"})
            .create()
        )

        assert created_extraction is not None
        assert created_extraction.workflow_id is not None

        result = created_extraction.run(RunWorkflowOptions(variables={}, limit=5))
        data = result.fetch_data({"limit": 5})

        assert data is not None
        assert len(data.data) == 5
        # Check that we have both structured fields and raw content
        assert "title" in data.data[0]
        assert "price" in data.data[0]
        assert "rawHtml" in data.data[0]

    @pytest.mark.integration
    @pytest.mark.timeout(700)
    @pytest.mark.asyncio
    async def test_classification_field(self, client):
        """Classification field."""
        created_extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Classification Test",
                    extraction=lambda builder: builder.classify(
                        "category",
                        "Product category",
                        [
                            ClassificationFieldCategoriesInner(
                                title="Electronics",
                                definition="Electronic devices and gadgets",
                            ),
                            ClassificationFieldCategoriesInner(
                                title="Clothing", definition="Apparel and fashion items"
                            ),
                            ClassificationFieldCategoriesInner(
                                title="Other", definition="Other products"
                            ),
                        ],
                    ),
                )
            )
            .bypass_preview()
            .set_interval({"interval": "ONLY_ONCE"})
            .create()
        )

        assert created_extraction is not None
        assert created_extraction.workflow_id is not None

        result = created_extraction.run(RunWorkflowOptions(limit=5, variables={}))
        data = result.fetch_data({"limit": 5})

        assert data is not None
        assert len(data.data) == 5
        # Check that we have the classification field
        assert "category" in data.data[0]

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    @pytest.mark.asyncio
    async def test_extraction_builder_with_additional_data(self, client):
        """Extraction builder with additionalData."""
        test_data = {
            "sourceSystem": "e2e-test",
            "metadata": {"version": 1, "testRun": True},
        }

        created_extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Extraction Builder Additional Data Test",
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

        try:
            assert created_extraction is not None
            assert created_extraction.workflow_id is not None

            # Note: Workflow.get() not yet implemented in Python SDK
            # This test will be updated when workflow service is available
            # For now, we just verify the extraction was created successfully
        finally:
            # Cleanup - Note: workflow.delete() not yet implemented
            # This will be added when workflow service is available
            pass
