"""
Event type definitions for Kadoa SDK.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import TypedDict, Literal, Union, Optional, List, Dict, Any
from enum import Enum


class EntityFieldDict(TypedDict, total=False):
    """Type definition for entity field."""

    name: str
    description: str
    example: str
    dataType: Union[str, Dict[str, Any]]
    isPrimaryKey: Optional[bool]


class EntityDetectedPayload(TypedDict):
    """Payload for entity:detected event."""

    entity: str  # Name of detected entity type (e.g., "Product", "Article")
    fields: List[EntityFieldDict]  # Data fields detected for the entity
    url: str  # URL that was analyzed for entity detection


class ExtractionStartedPayload(TypedDict):
    """Payload for extraction:started event."""

    workflowId: str  # Unique ID of the extraction process
    name: str  # Name given to this extraction
    urls: List[str]  # URLs to extract data from


class ExtractionStatusChangedPayload(TypedDict, total=False):
    """Payload for extraction:status_changed event."""

    workflowId: str  # Unique ID of the extraction process
    previousState: Optional[str]  # Previous processing state
    previousRunState: Optional[str]  # Previous execution status
    currentState: Optional[str]  # Current processing state
    currentRunState: Optional[str]  # Current execution status


class ExtractionDataAvailablePayload(TypedDict):
    """Payload for extraction:data_available event."""

    workflowId: str  # Unique ID of the extraction process
    recordCount: int  # Number of data records retrieved
    isPartial: bool  # Whether this is a partial data set


class ExtractionCompletedPayload(TypedDict, total=False):
    """Payload for extraction:completed event."""

    workflowId: str  # Unique ID of the extraction process
    success: bool  # Whether the extraction completed successfully
    finalRunState: Optional[str]  # Final execution status
    finalState: Optional[str]  # Final processing state
    recordCount: Optional[int]  # Number of records extracted (if successful)
    error: Optional[str]  # Error message (if failed)


# Event name literals
EntityDetected = Literal["entity:detected"]
ExtractionStarted = Literal["extraction:started"]
ExtractionStatusChanged = Literal["extraction:status_changed"]
ExtractionDataAvailable = Literal["extraction:data_available"]
ExtractionCompleted = Literal["extraction:completed"]

# Union of all event names
KadoaEventName = Union[
    EntityDetected,
    ExtractionStarted,
    ExtractionStatusChanged,
    ExtractionDataAvailable,
    ExtractionCompleted,
]

# Mapping of event names to payloads
EventPayloadMap = {
    "entity:detected": EntityDetectedPayload,
    "extraction:started": ExtractionStartedPayload,
    "extraction:status_changed": ExtractionStatusChangedPayload,
    "extraction:data_available": ExtractionDataAvailablePayload,
    "extraction:completed": ExtractionCompletedPayload,
}


@dataclass
class KadoaEvent:
    """
    Unified event structure with discriminated union.

    Attributes:
        type: Event type identifier
        timestamp: When the event occurred
        source: Module or component that emitted the event
        payload: Event-specific payload
        metadata: Optional metadata for debugging and tracking
    """

    type: str
    timestamp: datetime
    source: str
    payload: Union[
        EntityDetectedPayload,
        ExtractionStartedPayload,
        ExtractionStatusChangedPayload,
        ExtractionDataAvailablePayload,
        ExtractionCompletedPayload,
    ]
    metadata: Optional[Dict[str, Any]] = field(default=None)

    @classmethod
    def create(
        cls,
        event_type: str,
        payload: Dict[str, Any],
        source: str = "sdk",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> "KadoaEvent":
        """
        Create a new event instance.

        Args:
            event_type: The type of event
            payload: Event-specific payload data
            source: Source module/component
            metadata: Optional metadata

        Returns:
            New KadoaEvent instance
        """
        return cls(
            type=event_type,
            timestamp=datetime.now(),
            source=source,
            payload=payload,
            metadata=metadata,
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary."""
        return {
            "type": self.type,
            "timestamp": self.timestamp.isoformat(),
            "source": self.source,
            "payload": self.payload,
            "metadata": self.metadata,
        }


# Type alias for any Kadoa event
AnyKadoaEvent = KadoaEvent
