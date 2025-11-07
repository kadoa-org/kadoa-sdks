"""
E2E tests for fetch data functionality matching Node.js structure.
"""

import os

import pytest
import pytest_asyncio

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.extraction.types import FetchDataOptions
from tests.utils.seeder import seed_workflow


@pytest.mark.e2e
class TestFetchData:
    """E2E tests for fetch data functionality."""

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
            )
        )

        yield client

        client.dispose()

    @pytest_asyncio.fixture(scope="class")
    async def workflow_id(self, client):
        """Create a test workflow for fetch data tests."""
        result = seed_workflow("test-workflow-fetch-data", client, run_job=True)
        yield result["workflow_id"]

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    @pytest.mark.asyncio
    async def test_fetches_first_page_of_workflow_data(self, client, workflow_id):
        """Fetches first page of workflow data."""
        result = client.extraction.data_fetcher.fetch_data(
            FetchDataOptions(
                workflow_id=workflow_id,
                page=1,
                limit=10,
            )
        )

        assert result is not None
        assert result.workflow_id == workflow_id
        assert result.data is not None
        assert isinstance(result.data, list)
        assert result.pagination is not None

        if result.pagination:
            assert result.pagination.page == 1
            assert result.pagination.limit == 10

        print(f"[Test] Fetched {len(result.data)} items from page 1")

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    @pytest.mark.asyncio
    async def test_fetches_multiple_pages(self, client, workflow_id):
        """Fetches multiple pages."""
        page1 = client.extraction.data_fetcher.fetch_data(
            FetchDataOptions(
                workflow_id=workflow_id,
                page=1,
                limit=5,
            )
        )

        page2 = client.extraction.data_fetcher.fetch_data(
            FetchDataOptions(
                workflow_id=workflow_id,
                page=2,
                limit=5,
            )
        )

        assert page1.pagination.page == 1
        assert page2.pagination.page == 2

        if len(page1.data) > 0 and len(page2.data) > 0:
            assert page1.data[0] != page2.data[0]

        print(f"[Test] Fetched page 1: {len(page1.data)} items, page 2: {len(page2.data)} items")

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    @pytest.mark.asyncio
    async def test_handles_different_query_parameters(self, client, workflow_id):
        """Handles different query parameters."""
        asc_result = client.extraction.data_fetcher.fetch_data(
            FetchDataOptions(
                workflow_id=workflow_id,
                page=1,
                limit=5,
                order="asc",
            )
        )

        desc_result = client.extraction.data_fetcher.fetch_data(
            FetchDataOptions(
                workflow_id=workflow_id,
                page=1,
                limit=5,
                order="desc",
            )
        )

        assert asc_result is not None
        assert desc_result is not None

        print(
            f"[Test] Tested different sort orders - "
            f"ASC: {len(asc_result.data)} items, DESC: {len(desc_result.data)} items"
        )
