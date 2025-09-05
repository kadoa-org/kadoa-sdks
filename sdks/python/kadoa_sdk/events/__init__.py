"""
Event system for Kadoa SDK.
"""

from kadoa_sdk.events.emitter import KadoaEventEmitter, EventEmitter
from kadoa_sdk.events.event_types import (
    KadoaEvent,
    KadoaEventName,
    AnyKadoaEvent,
    EntityDetectedPayload,
    ExtractionStartedPayload,
    ExtractionStatusChangedPayload,
    ExtractionDataAvailablePayload,
    ExtractionCompletedPayload,
)

__all__ = [
    "EventEmitter",
    "KadoaEventEmitter",
    "KadoaEvent",
    "KadoaEventName",
    "AnyKadoaEvent",
    "EntityDetectedPayload",
    "ExtractionStartedPayload",
    "ExtractionStatusChangedPayload",
    "ExtractionDataAvailablePayload",
    "ExtractionCompletedPayload",
]
