"""Root test fixtures."""

import pytest
import pytest_asyncio

from kadoa_sdk.core.settings import get_settings
from tests.utils.client_factory import create_client, create_realtime_client
from tests.utils.shared_fixtures import clear_fixture_cache


@pytest.fixture(scope="module")
def api_key():
    """API key for tests that create their own client."""
    return get_settings().api_key


@pytest.fixture(scope="module")
def client():
    """Sync client for most tests."""
    c = create_client()
    yield c
    c.dispose()


@pytest_asyncio.fixture(scope="module")
async def realtime_client():
    """Async client with realtime connection."""
    c = await create_realtime_client()
    yield c
    c.dispose()


@pytest.fixture(scope="module", autouse=True)
def clear_fixtures_after_tests():
    """Clear shared fixture cache after all tests in module complete."""
    yield
    clear_fixture_cache()
