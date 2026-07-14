from .client import (
    KadoaClient,
    KadoaClientConfig,
    KadoaClientStatus,
    TestNotificationRequest,
    TestNotificationResult,
)
from .core import KadoaHttpError, KadoaSdkError
from .extraction import (
    ExportDataFormat,
    ExportDataOptions,
    ExportDataResult,
    ExtractionModule,
    ExtractionOptions,
    ExtractionResult,
    ExtractOptions,
    FetchDataOptions,
    FetchDataResult,
    RunWorkflowOptions,
    run_extraction,
)
from .schemas import FieldOptions
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
    "ExportDataFormat",
    "ExportDataOptions",
    "ExportDataResult",
    "ExtractOptions",
    "ExtractionModule",
    "ExtractionOptions",
    "ExtractionResult",
    "FetchDataOptions",
    "FetchDataResult",
    "FieldOptions",
    "RunWorkflowOptions",
    "run_extraction",
    "__version__",
]
