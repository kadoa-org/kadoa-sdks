from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional

from openapi_client.models.v4_workflows_workflow_id_get200_response import (
    V4WorkflowsWorkflowIdGet200Response,
)

NavigationMode = Literal[
    "single-page",
    "paginated-page",
    "page-and-detail",
    "agentic-navigation",
]


@dataclass
class ExtractionOptions:
    urls: List[str]
    navigation_mode: Optional[NavigationMode] = None
    name: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    polling_interval: Optional[float] = None  # seconds
    max_wait_time: Optional[float] = None  # seconds
    max_records: Optional[int] = None
    additional_data: Optional[Dict[str, Any]] = None


@dataclass
class ExtractionResult:
    workflow_id: Optional[str]
    workflow: Optional[V4WorkflowsWorkflowIdGet200Response] = None
    data: Optional[List[dict]] = None


DEFAULTS = {
    "polling_interval": 5.0,  # seconds
    "max_wait_time": 300.0,  # seconds
    "navigation_mode": "single-page",
    "location": {"type": "auto"},
    "name": "Untitled Workflow",
    "max_records": 1000,
}
