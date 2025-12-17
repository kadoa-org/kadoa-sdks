from __future__ import annotations

from typing import Optional, TypedDict

from pydantic import BaseModel

from ..notifications import NotificationSettingsEventType
from ..user import KadoaUser


class KadoaClientConfig(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    timeout: Optional[int] = None


class RealtimeOptions(TypedDict, total=False):
    heartbeat_interval: int
    reconnect_delay: int
    missed_heartbeats_limit: int


class KadoaClientStatus(BaseModel):
    """Status information for the Kadoa client"""

    base_url: str
    user: KadoaUser
    realtime_connected: bool


# Ensure forward references are resolved for Pydantic (e.g. KadoaUser)
KadoaClientStatus.model_rebuild()


class TestNotificationRequest(BaseModel):
    event_type: NotificationSettingsEventType
    workflow_id: Optional[str] = None


class TestNotificationResult(BaseModel):
    event_id: str
    event_type: NotificationSettingsEventType
    workflow_id: Optional[str] = None


