"""
E2E tests for KadoaClient status functionality matching Node.js structure.
"""

import os

import pytest
import pytest_asyncio

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings


@pytest.mark.e2e
class TestKadoaClient:
    """E2E tests for KadoaClient."""

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

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_should_get_the_status_of_the_client(self, client):
        """Should get the status of the client."""
        # Note: Python SDK doesn't have a status() method yet
        # This test verifies basic client functionality
        # When status() is implemented, update this test
        settings = get_settings()
        base_url = (
            settings.public_api_uri
            if os.getenv("KADOA_PUBLIC_API_URI")
            else "http://localhost:12380"
        )

        assert client.base_url == base_url
        assert client.api_key is not None

        # Verify user can be retrieved (indirect status check)
        user = await client.user.get_current_user()
        assert user is not None
        assert user.user_id is not None
        assert user.email is not None
