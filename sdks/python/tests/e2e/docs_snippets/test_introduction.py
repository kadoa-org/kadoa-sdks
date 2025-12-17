"""PY-INTRODUCTION: sdks/introduction.mdx snippets"""

import pytest
from kadoa_sdk.extraction.types import ExtractOptions, ExtractionOptions, RunWorkflowOptions
from kadoa_sdk.schemas.schema_builder import FieldOptions
from .conftest import delete_workflow_by_name


class TestIntroductionSnippets:

    @pytest.mark.e2e
    @pytest.mark.timeout(300)
    def test_introduction_001_quick_start(self, client):
        """PY-INTRODUCTION-001: Quick start example"""
        workflow_name = "My First Extraction"
        delete_workflow_by_name(client, workflow_name)

        # @docs-preamble PY-INTRODUCTION-001
        # from kadoa_sdk import KadoaClient, KadoaClientConfig
        #
        # client = KadoaClient(config=KadoaClientConfig(api_key="your-api-key"))
        # @docs-preamble-end PY-INTRODUCTION-001
        # @docs-start PY-INTRODUCTION-001
        result = client.extraction.run(
            ExtractionOptions(
                urls=["https://sandbox.kadoa.com/ecommerce"],
                name="My First Extraction",
                limit=10,
            )
        )

        print(result.data)
        # @docs-end PY-INTRODUCTION-001

        assert result is not None

        # Cleanup
        if result.workflow_id:
            client.workflow.delete(result.workflow_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(300)
    def test_introduction_002_define_extraction(self, client):
        """PY-INTRODUCTION-002: Define what to extract"""
        workflow_name = "Product Monitor"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-INTRODUCTION-002
        extract_options = ExtractOptions(
            urls=["https://sandbox.kadoa.com/ecommerce"],
            name="Product Monitor",
            extraction=lambda builder: builder.entity("Product")
            .field("name", "Product name", "STRING", FieldOptions(example="MacBook Pro"))
            .field("price", "Price in USD", "MONEY")
            .field("inStock", "Is available", "BOOLEAN"),
        )

        workflow = client.extract(extract_options).create()
        print(f"Workflow created: {workflow.workflow_id}")

        result = workflow.run(RunWorkflowOptions(limit=10))
        response = result.fetch_data({})
        print(response.data)
        # @docs-end PY-INTRODUCTION-002

        assert workflow.workflow_id is not None
        assert response.data is not None

        # Cleanup
        if workflow.workflow_id:
            client.workflow.delete(workflow.workflow_id)
