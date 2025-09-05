"""
Kadoa SDK for Python.

A Python SDK for interacting with the Kadoa API.
"""

from kadoa_sdk.events import (
    AnyKadoaEvent,
    KadoaEvent,
    KadoaEventEmitter,
    KadoaEventName,
)
from kadoa_sdk.exceptions import KadoaErrorCode, KadoaHttpException, KadoaSdkException
from kadoa_sdk.extraction import (
    ExtractionOptions,
    ExtractionResult,
    Location,
    NavigationMode,
    WorkflowStatus,
    run_extraction,
)
from kadoa_sdk.kadoa_sdk import (
    KadoaSdk,
    KadoaSdkConfig,
    dispose,
    get_config,
    get_http_client,
    initialize_sdk,
)

__version__ = "0.4.0"

__all__ = [
    # App functions
    "initialize_sdk",
    "get_config",
    "get_http_client",
    "dispose",
    # App types
    "KadoaSdk",
    "KadoaSdkConfig",
    # Extraction functions
    "run_extraction",
    # Extraction types
    "ExtractionOptions",
    "ExtractionResult",
    "NavigationMode",
    "Location",
    "WorkflowStatus",
    # Exceptions
    "KadoaSdkException",
    "KadoaHttpException",
    "KadoaErrorCode",
    # Events
    "KadoaEvent",
    "KadoaEventName",
    "AnyKadoaEvent",
    "KadoaEventEmitter",
]
