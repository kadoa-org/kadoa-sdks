"""
E2E tests for extraction functionality matching Node.js structure.
"""

import os

import pytest
import pytest_asyncio

from kadoa_sdk import (
    ExtractionOptions,
    KadoaClient,
    KadoaClientConfig,
)
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.extraction.services.data_fetcher_service import DataFetcherService
from kadoa_sdk.extraction.types import FetchDataOptions


@pytest.mark.e2e
class TestExtraction:
    """E2E tests for extraction functionality."""

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
                timeout=settings.get_timeout_seconds(),
                enable_realtime=True,
            )
        )

        yield client

        client.dispose()

    @pytest.mark.integration
    @pytest.mark.timeout(700)
    @pytest.mark.asyncio
    async def test_extracts_data_from_valid_url_with_minimal_config_default_preview_mode(
        self, client
    ):
        """Extracts data from valid URL with minimal config (default preview mode)."""
        result = client.extraction.run(
            ExtractionOptions(
                urls=["https://sandbox.kadoa.com/careers"],
                name="test-extraction-with-minimal-config",
            )
        )

        assert result is not None
        assert result.workflow_id is not None
        assert result.data is not None
        assert len(result.data) > 0

    @pytest.mark.integration
    @pytest.mark.timeout(700)
    @pytest.mark.asyncio
    async def test_extracts_data_from_valid_url_with_notifications_setup(self, client):
        """Extracts data from valid URL with notifications setup."""
        # Note: Notifications not yet implemented in Python SDK
        # This test will be updated when notifications are available
        result = client.extraction.run(
            ExtractionOptions(
                urls=["https://sandbox.kadoa.com/ecommerce"],
                name="test-extraction-with-notifications",
                navigation_mode="paginated-page",
            )
        )

        assert result is not None
        assert result.workflow_id is not None
        assert result.data is not None
        assert len(result.data) > 0

    @pytest.mark.integration
    @pytest.mark.timeout(700)
    @pytest.mark.asyncio
    async def test_extracts_data_waits_for_approval_and_then_finishes(self, client):
        """Extracts data, waits for approval and then finishes."""
        # Note: Workflow resume/delete not yet implemented in Python SDK
        # This test will be updated when workflow service is available
        result = client.extraction.run(
            ExtractionOptions(
                urls=["https://sandbox.kadoa.com/careers"],
                name="test-extraction-bypass-preview-true",
            )
        )

        assert result is not None
        assert result.workflow_id is not None
        assert result.data is not None
        assert len(result.data) > 0
        # Note: Can't check workflow.state without workflow service
        # assert result.workflow.state == "PREVIEW"

    @pytest.mark.integration
    @pytest.mark.timeout(700)
    @pytest.mark.asyncio
    async def test_extracts_data_from_existing_workflow(self, client):
        """Extracts data from existing workflow."""
        # Note: This test requires workflow service methods that aren't implemented yet
        # For now, we'll create a workflow and run it
        from tests.utils.seeder import seed_workflow

        workflow_result = seed_workflow(
            name="test-extraction-existing-workflow",
            client=client,
            run_job=True,
        )
        workflow_id = workflow_result["workflow_id"]
        job_id = workflow_result.get("job_id")

        # Fetch data using the data fetcher
        data_fetcher = DataFetcherService(client)
        data = data_fetcher.fetch_data(
            FetchDataOptions(
                workflow_id=workflow_id,
                run_id=job_id,
                page=1,
                limit=10,
            )
        )

        assert data is not None
        assert data.data is not None
