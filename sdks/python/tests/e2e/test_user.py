"""
E2E tests for user functionality matching Node.js structure.
"""

import pytest
import pytest_asyncio

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.exceptions import KadoaHttpError
from kadoa_sdk.core.settings import get_settings


@pytest.mark.e2e
class TestUser:
    """E2E tests for user functionality."""

    @pytest_asyncio.fixture(scope="class")
    async def client(self):
        """Initialize client for all tests in this class."""
        settings = get_settings()
        client = KadoaClient(
            KadoaClientConfig(
                api_key=settings.api_key,
                timeout=30,
            )
        )

        yield client

        client.dispose()

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_should_get_current_user_for_valid_api_key(self, client):
        """Should get current user for valid api key."""
        result = await client.user.get_current_user()

        assert result is not None
        assert result.user_id is not None
        assert result.email is not None
        assert result.feature_flags is not None

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_should_throw_error_for_invalid_api_key(self):
        """Should throw error for invalid api key."""
        client = KadoaClient(
            KadoaClientConfig(
                api_key="invalid-api-key",
                timeout=30,
            )
        )

        try:
            with pytest.raises(KadoaHttpError):
                await client.user.get_current_user()
        finally:
            client.dispose()
