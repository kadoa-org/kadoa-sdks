from __future__ import annotations

from typing import Any, Callable, Dict, List, Literal, Optional, Union

from pydantic import BaseModel

from ..core.pagination import PageInfo
from ..extraction.extraction_acl import V4WorkflowsWorkflowIdGet200Response
from ..schemas.schema_builder import SchemaBuilder

NavigationMode = Literal[
    "single-page",
    "paginated-page",
    "page-and-detail",
    "agentic-navigation",
]

WorkflowInterval = Literal[
    "ONLY_ONCE",
    "REAL_TIME",
    "HOURLY",
    "DAILY",
    "WEEKLY",
    "MONTHLY",
    "CUSTOM",
]

LocationConfig = Dict[str, Any]

WorkflowMonitoringConfig = Dict[str, Any]

# Entity config can be "ai-detection", {schemaId: str}, or {name?: str, fields: List}
EntityConfig = Union[
    Literal["ai-detection"],
    Dict[str, str],  # {schemaId: str}
    Dict[str, Any],  # {name?: str, fields: List}
]

# Extract callback can return SchemaBuilder or {schemaId: str}
ExtractCallback = Callable[[SchemaBuilder], Union[SchemaBuilder, Dict[str, str]]]


class ExtractionOptions(BaseModel):
    urls: List[str]
    navigation_mode: Optional[NavigationMode] = None
    name: Optional[str] = None
    location: Optional[LocationConfig] = None
    polling_interval: Optional[float] = None  # seconds
    max_wait_time: Optional[float] = None  # seconds
    max_records: Optional[int] = None
    additional_data: Optional[Dict[str, Any]] = None


class ExtractionResult(BaseModel):
    workflow_id: Optional[str]
    workflow: Optional[V4WorkflowsWorkflowIdGet200Response] = None
    data: Optional[List[dict]] = None
    pagination: Optional[PageInfo] = None


class SubmitExtractionResult(BaseModel):
    workflow_id: str
    needs_notification_setup: Optional[bool] = None


class FetchDataOptions(BaseModel):
    workflow_id: str
    run_id: Optional[str] = None
    sort_by: Optional[str] = None
    order: Optional[Literal["asc", "desc"]] = None
    filters: Optional[str] = None
    page: Optional[int] = None
    limit: Optional[int] = None
    include_anomalies: Optional[bool] = None


class FetchDataResult(BaseModel):
    """Result of fetching workflow data with pagination"""

    data: List[dict]
    workflow_id: str
    run_id: Optional[str] = None
    executed_at: Optional[str] = None
    pagination: Optional[PageInfo] = None


class ExtractOptions(BaseModel):
    """Options for extraction builder"""

    urls: List[str]
    name: str
    description: Optional[str] = None
    navigation_mode: Optional[NavigationMode] = None
    extraction: Optional[ExtractCallback] = None
    additional_data: Optional[Dict[str, Any]] = None
    bypass_preview: Optional[bool] = None


class ExtractOptionsInternal(BaseModel):
    """Internal extraction options"""

    urls: List[str]
    name: str
    navigation_mode: NavigationMode
    entity: EntityConfig
    description: Optional[str] = None
    bypass_preview: Optional[bool] = None
    interval: Optional[WorkflowInterval] = None
    schedules: Optional[List[str]] = None
    location: Optional[LocationConfig] = None
    additional_data: Optional[Dict[str, Any]] = None


class RunWorkflowOptions(BaseModel):
    variables: Optional[Dict[str, Any]] = None
    limit: Optional[int] = None


class WaitForReadyOptions(BaseModel):
    target_state: Optional[Literal["PREVIEW", "ACTIVE"]] = None
    poll_interval_ms: Optional[int] = None
    timeout_ms: Optional[int] = None


DEFAULTS = {
    "polling_interval": 5.0,  # seconds
    "max_wait_time": 300.0,  # seconds
    "navigation_mode": "single-page",
    "location": {"type": "auto"},
    "name": "Untitled Workflow",
    "max_records": 1000,
}
