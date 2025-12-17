"""
E2E tests for KadoaClient status functionality matching Node.js structure.
"""

import pytest


@pytest.mark.e2e
class TestKadoaClient:
    """E2E tests for KadoaClient."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_should_get_the_status_of_the_client(self, client):
        """Should get the status of the client."""
        status = await client.status()

        assert status is not None
        assert status.base_url is not None
        assert status.user is not None
        assert status.user.user_id is not None
        assert status.user.email is not None
