"""PY-DATA-DELIVERY: data-delivery/sdk.mdx snippets"""

import asyncio
import pytest
from kadoa_sdk.extraction.types import ExtractionOptions, FetchDataOptions
from .conftest import track_workflow


class TestDataDeliverySnippets:

    @pytest.mark.e2e
    @pytest.mark.timeout(300)
    def test_data_delivery_001_basic_usage(self, client):
        """PY-DATA-DELIVERY-001: Basic usage"""
        # @docs-start PY-DATA-DELIVERY-001
        result = client.extraction.run(
            ExtractionOptions(
                urls=["https://sandbox.kadoa.com/ecommerce"],
                name="Product Extraction",
            )
        )

        # Data is included in the result
        print(result.data)  # Array of extracted items
        print(result.pagination)  # { page, limit, totalCount, totalPages }
        # @docs-end PY-DATA-DELIVERY-001

        assert result is not None
        track_workflow(result.workflow_id)
        assert result.data is not None
        assert result.pagination is not None

    @pytest.mark.e2e
    @pytest.mark.timeout(300)
    def test_data_delivery_002_fetch_data_simple(self, client, fixture_workflow_id):
        """PY-DATA-DELIVERY-002: Fetch data simple"""
        if not fixture_workflow_id:
            raise ValueError("Fixture workflow not created")
        # @docs-start PY-DATA-DELIVERY-002
        # Simplest way to fetch workflow data
        data = client.extraction.fetch_data(FetchDataOptions(workflow_id=fixture_workflow_id))
        print(data.data)
        # @docs-end PY-DATA-DELIVERY-002

        assert data is not None

    @pytest.mark.e2e
    @pytest.mark.timeout(300)
    def test_data_delivery_003_fetch_with_options(self, client, fixture_workflow_id):
        """PY-DATA-DELIVERY-003: Fetch data with options"""
        if not fixture_workflow_id:
            raise ValueError("Fixture workflow not created")
        # @docs-start PY-DATA-DELIVERY-003
        data = client.extraction.fetch_data(
            FetchDataOptions(
                workflow_id=fixture_workflow_id,
                page=1,
                limit=10,
            )
        )

        print(data.data)
        print(data.pagination)
        # @docs-end PY-DATA-DELIVERY-003

        assert data.data is not None

    @pytest.mark.e2e
    @pytest.mark.timeout(300)
    def test_data_delivery_004_pagination(self, client, fixture_workflow_id):
        """PY-DATA-DELIVERY-004: Pagination"""
        if not fixture_workflow_id:
            raise ValueError("Fixture workflow not created")
        # @docs-start PY-DATA-DELIVERY-004
        # Option 1: Iterate page by page
        async def iterate_pages() -> None:
            async for page in client.extraction.fetch_data_pages(
                FetchDataOptions(workflow_id=fixture_workflow_id)
            ):
                print("Page data:", page.data)
                if page.pagination:
                    print("Page number:", page.pagination.page)

        asyncio.run(iterate_pages())

        # Option 2: Get everything at once
        all_data = client.extraction.fetch_all_data(FetchDataOptions(workflow_id=fixture_workflow_id))
        print("All data:", all_data)
        # @docs-end PY-DATA-DELIVERY-004

        assert all_data is not None
