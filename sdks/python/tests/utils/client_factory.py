"""Client factory functions for test fixtures."""

from typing import TYPE_CHECKING

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings

if TYPE_CHECKING:
    pass


def create_client(timeout: int = 30) -> KadoaClient:
    """Create a KadoaClient instance."""
    settings = get_settings()
    return KadoaClient(KadoaClientConfig(api_key=settings.api_key, timeout=timeout))


async def create_realtime_client(timeout: int = 30) -> KadoaClient:
    """Create a KadoaClient with realtime connection."""
    client = create_client(timeout)
    await client.connect_realtime()
    return client
