from __future__ import annotations

from datetime import datetime
from threading import RLock
from typing import Any, Dict, List, Literal, Optional, Protocol, TypedDict, Union

from pydantic import BaseModel


class EntityField(TypedDict, total=False):
    name: str
    description: str
    example: str
    dataType: Union[str, Dict[str, Any]]
    isPrimaryKey: bool


class EntityDetectedPayload(TypedDict):
    entity: str
    fields: List[EntityField]
    url: str


class ExtractionStartedPayload(TypedDict):
    workflowId: str
    name: str
    urls: List[str]


class ExtractionStatusChangedPayload(TypedDict, total=False):
    workflowId: str
    previousState: Optional[str]
    previousRunState: Optional[str]
    currentState: Optional[str]
    currentRunState: Optional[str]


class ExtractionDataAvailablePayload(TypedDict):
    workflowId: str
    recordCount: int
    isPartial: bool


class ExtractionCompletedPayload(TypedDict, total=False):
    workflowId: str
    success: bool
    finalRunState: Optional[str]
    finalState: Optional[str]
    recordCount: Optional[int]
    error: Optional[str]


class RealtimeConnectedPayload(TypedDict, total=False):
    teamId: Optional[str]
    connectedAt: datetime


class RealtimeDisconnectedPayload(TypedDict):
    reason: Optional[str]
    willReconnect: bool


class RealtimeEventPayload(TypedDict, total=False):
    data: Any
    id: Optional[str]
    type: Optional[str]


class RealtimeHeartbeatPayload(TypedDict):
    timestamp: datetime


class RealtimeErrorPayload(TypedDict, total=False):
    message: str
    code: Optional[str]
    details: Optional[Any]


EventPayloadMap = Union[
    EntityDetectedPayload,
    ExtractionStartedPayload,
    ExtractionStatusChangedPayload,
    ExtractionDataAvailablePayload,
    ExtractionCompletedPayload,
    RealtimeConnectedPayload,
    RealtimeDisconnectedPayload,
    RealtimeEventPayload,
    RealtimeHeartbeatPayload,
    RealtimeErrorPayload,
]

KadoaEventName = Literal[
    "entity:detected",
    "extraction:started",
    "extraction:status_changed",
    "extraction:data_available",
    "extraction:completed",
    "realtime:connected",
    "realtime:disconnected",
    "realtime:event",
    "realtime:heartbeat",
    "realtime:error",
]


class KadoaEvent(BaseModel):
    type: KadoaEventName
    timestamp: datetime
    source: str
    payload: EventPayloadMap
    metadata: Optional[Dict[str, Any]] = None


AnyKadoaEvent = KadoaEvent


class EventListener(Protocol):
    def __call__(self, event: AnyKadoaEvent) -> None: ...


class KadoaEventEmitter:
    def __init__(self) -> None:
        self._listeners: List[EventListener] = []
        self._lock = RLock()

    def emit(
        self,
        event_name: KadoaEventName,
        payload: EventPayloadMap,
        source: str = "sdk",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        event = KadoaEvent(
            type=event_name,
            timestamp=datetime.now(),
            source=source,
            payload=payload,
            metadata=metadata,
        )
        with self._lock:
            for listener in list(self._listeners):
                try:
                    listener(event)
                except Exception:
                    pass

    def on_event(self, listener: EventListener) -> None:
        with self._lock:
            self._listeners.append(listener)

    def once_event(self, listener: EventListener) -> None:
        def once_wrapper(event: AnyKadoaEvent) -> None:
            self.off_event(once_wrapper)
            listener(event)

        self.on_event(once_wrapper)

    def off_event(self, listener: EventListener) -> None:
        with self._lock:
            self._listeners = [
                listener_item for listener_item in self._listeners if listener_item is not listener
            ]

    def remove_all_event_listeners(self) -> None:
        with self._lock:
            self._listeners.clear()
