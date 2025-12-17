"""Client public API exports.

This package replaces the previous `kadoa_sdk/client.py` module while keeping the
same import paths working:

- `from kadoa_sdk.client import KadoaClient`
- `from kadoa_sdk import KadoaClient`
"""

from .models import (
    KadoaClientConfig,
    KadoaClientStatus,
    RealtimeOptions,
    TestNotificationRequest,
    TestNotificationResult,
)
from .client import KadoaClient

__all__ = [
    "KadoaClient",
    "KadoaClientConfig",
    "KadoaClientStatus",
    "RealtimeOptions",
    "TestNotificationRequest",
    "TestNotificationResult",
]


