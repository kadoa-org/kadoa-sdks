from .client import KadoaClient, KadoaClientConfig
from .core import KadoaHttpException, KadoaSdkException
from .core.events import AnyKadoaEvent, KadoaEvent
from .extraction import (
    ExtractionModule,
    ExtractionOptions,
    ExtractionResult,
    run_extraction,
)


class KadoaSdkConfig(KadoaClientConfig):
    pass


def initialize_sdk(config: KadoaSdkConfig) -> KadoaClient:
    return KadoaClient(config)


__all__ = [
    "KadoaClient",
    "KadoaClientConfig",
    "KadoaSdkConfig",
    "initialize_sdk",
    "KadoaSdkException",
    "KadoaHttpException",
    "KadoaEvent",
    "AnyKadoaEvent",
    "ExtractionModule",
    "ExtractionOptions",
    "ExtractionResult",
    "run_extraction",
]


