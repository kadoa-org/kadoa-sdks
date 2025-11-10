from __future__ import annotations

from typing import Any, Callable, Dict, List, Literal, Optional, Union

from pydantic import BaseModel

from openapi_client.models.location import Location
from openapi_client.models.monitoring_config import MonitoringConfig

from ..core.pagination import PageInfo
from ..extraction.extraction_acl import GetWorkflowResponse
from ..schemas.schema_builder import SchemaBuilder

# Navigation mode enum - matches WorkflowWithEntityAndFields.navigation_mode validator
# Python's OpenAPI generator doesn't create enum classes, so we use Literal types
NavigationMode = Literal[
    "single-page",
    "paginated-page",
    "page-and-detail",
    "agentic-navigation",
]

# Workflow interval enum - matches WorkflowWithEntityAndFields.interval validator
# Python's OpenAPI generator doesn't create enum classes, so we use Literal types
WorkflowInterval = Literal[
    "ONLY_ONCE",
    "EVERY_10_MINUTES",
    "HALF_HOURLY",
    "HOURLY",
    "THREE_HOURLY",
    "SIX_HOURLY",
    "TWELVE_HOURLY",
    "EIGHTEEN_HOURLY",
    "DAILY",
    "TWO_DAY",
    "THREE_DAY",
    "WEEKLY",
    "BIWEEKLY",
    "TRIWEEKLY",
    "FOUR_WEEKS",
    "MONTHLY",
    "REAL_TIME",
    "CUSTOM",
]


# Type alias for location configuration - uses generated Location model
# Pydantic models accept dicts, so dict literals like {"type": "auto"} are compatible
LocationConfig = Location

# Type alias for monitoring configuration - uses generated MonitoringConfig model
# Pydantic models accept dicts, so dict literals are compatible
WorkflowMonitoringConfig = MonitoringConfig

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
    workflow: Optional[GetWorkflowResponse] = None
    data: Optional[List[Dict[str, Any]]] = None
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

    data: List[Dict[str, Any]]
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
    "max_records": 1000,
}
