from .client import (
    KadoaClient,
    KadoaClientConfig,
    KadoaClientStatus,
    TestNotificationRequest,
    TestNotificationResult,
)
from .core import KadoaHttpError, KadoaSdkError
from .extraction import (
    ExtractionModule,
    ExtractionOptions,
    ExtractionResult,
    run_extraction,
)
from .version import __version__


class KadoaSdkConfig(KadoaClientConfig):
    pass


def initialize_sdk(config: KadoaSdkConfig) -> KadoaClient:
    return KadoaClient(config)


__all__ = [
    "KadoaClient",
    "KadoaClientConfig",
    "KadoaClientStatus",
    "KadoaSdkConfig",
    "initialize_sdk",
    "KadoaSdkError",
    "KadoaHttpError",
    "TestNotificationRequest",
    "TestNotificationResult",
    "ExtractionModule",
    "ExtractionOptions",
    "ExtractionResult",
    "run_extraction",
    "__version__",
]
