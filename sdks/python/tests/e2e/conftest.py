"""
Shared fixtures for E2E tests.

Provides module-scoped client fixtures per SDK_TEST_GUIDE.md patterns.
"""

import pytest
import pytest_asyncio

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from tests.utils.shared_fixtures import clear_fixture_cache


@pytest.fixture(scope="module")
def client():
    """Sync client for most tests (validation, workflows, etc.)."""
    settings = get_settings()
    client = KadoaClient(
        KadoaClientConfig(
            api_key=settings.api_key,
            timeout=30,
        )
    )
    yield client
    client.dispose()


@pytest_asyncio.fixture(scope="module")
async def realtime_client():
    """Async client with realtime connection for extraction tests."""
    settings = get_settings()
    client = KadoaClient(
        KadoaClientConfig(
            api_key=settings.api_key,
            timeout=30,
        )
    )
    await client.connect_realtime()
    yield client
    client.dispose()


@pytest.fixture(scope="module", autouse=True)
def clear_fixtures_after_tests():
    """Clear shared fixture cache after all tests in module complete."""
    yield
    clear_fixture_cache()
