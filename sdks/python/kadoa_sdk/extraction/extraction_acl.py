"""Extraction/Workflows domain ACL.

Wraps generated WorkflowsApi, CrawlApi requests/responses and normalizes types.
Downstream code must import from this module instead of `openapi_client/**`.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Literal, List, Optional, Dict, Any

from pydantic import BaseModel, ConfigDict

try:  # pragma: no cover - compatibility shim for generator rename
    from openapi_client.api.crawler_api import CrawlerApi as CrawlApi  # type: ignore[attr-defined]
except ImportError:  # pragma: no cover
    from openapi_client.api.crawl_api import CrawlApi  # type: ignore[attr-defined]

from openapi_client.api.workflows_api import WorkflowsApi
from openapi_client.models.create_workflow_body import CreateWorkflowBody
from openapi_client.models.v4_workflows_workflow_id_data_get200_response import (
    V4WorkflowsWorkflowIdDataGet200Response,
)
from openapi_client.models.v4_workflows_get200_response_workflows_inner import (
    V4WorkflowsGet200ResponseWorkflowsInner,
)
from openapi_client.models.v4_workflows_workflow_id_get200_response import (
    V4WorkflowsWorkflowIdGet200Response,
)
from openapi_client.models.v4_workflows_workflow_id_metadata_put200_response import (
    V4WorkflowsWorkflowIdMetadataPut200Response,
)
from openapi_client.models.v4_workflows_workflow_id_metadata_put_request import (
    V4WorkflowsWorkflowIdMetadataPutRequest,
)
from openapi_client.models.v4_workflows_workflow_id_run_put200_response import (
    V4WorkflowsWorkflowIdRunPut200Response,
)
from openapi_client.models.v4_workflows_workflow_id_jobs_job_id_get200_response import (
    V4WorkflowsWorkflowIdJobsJobIdGet200Response,
)
from openapi_client.models.workflow_with_entity_and_fields import WorkflowWithEntityAndFields

if TYPE_CHECKING:
    from ..schemas.schemas_acl import (
        ClassificationField,
        DataField,
        DataFieldExample,
        RawContentField,
        SchemaResponseSchemaInner,
    )

__all__ = ["WorkflowsApi", "CrawlApi"]

# ========================================
# Enum Types
# ========================================

WorkflowStateEnum = Literal[
    "ACTIVE",
    "ERROR",
    "PAUSED",
    "NOT_SUPPORTED",
    "PREVIEW",
    "COMPLIANCE_REVIEW",
    "COMPLIANCE_REJECTED",
    "QUEUED",
    "SETUP",
    "DELETED",
]

WorkflowDisplayStateEnum = Literal[
    "ACTIVE",
    "ERROR",
    "PAUSED",
    "NOT_SUPPORTED",
    "PREVIEW",
    "COMPLIANCE_REVIEW",
    "COMPLIANCE_REJECTED",
    "QUEUED",
    "SETUP",
    "RUNNING",
    "FAILED",
    "DELETED",
]

JobStateEnum = Literal[
    "IN_PROGRESS",
    "FINISHED",
    "FAILED",
    "NOT_SUPPORTED",
    "FAILED_INSUFFICIENT_FUNDS",
]

# ========================================
# Response Types with Enum Remapping
# ========================================


class WorkflowResponse(V4WorkflowsGet200ResponseWorkflowsInner):
    """Workflow response with SDK-curated enum types.
    
    Remaps generated enum fields to prevent type leakage.
    """

    state: Optional[WorkflowStateEnum] = None
    display_state: Optional[WorkflowDisplayStateEnum] = None
    additional_data: Optional[Dict[str, Any]] = None

    @classmethod
    def from_generated(
        cls, response: V4WorkflowsGet200ResponseWorkflowsInner
    ) -> "WorkflowResponse":
        """Create WorkflowResponse from generated type."""
        return cls.model_validate(response.model_dump())


class GetWorkflowResponse(V4WorkflowsWorkflowIdGet200Response):
    """Get workflow response with SDK-curated enum types.
    
    Remaps generated enum fields to prevent type leakage.
    """

    state: Optional[WorkflowStateEnum] = None
    display_state: Optional[WorkflowDisplayStateEnum] = None
    additional_data: Optional[Dict[str, Any]] = None

    @classmethod
    def from_generated(
        cls, response: V4WorkflowsWorkflowIdGet200Response
    ) -> "GetWorkflowResponse":
        """Create GetWorkflowResponse from generated type."""
        return cls.model_validate(response.model_dump())


class GetJobResponse(V4WorkflowsWorkflowIdJobsJobIdGet200Response):
    """Get job response with SDK-curated enum types.
    
    Remaps generated enum fields to prevent type leakage.
    """

    state: Optional[JobStateEnum] = None

    @classmethod
    def from_generated(
        cls, response: V4WorkflowsWorkflowIdJobsJobIdGet200Response
    ) -> "GetJobResponse":
        """Create GetJobResponse from generated type."""
        return cls.model_validate(response.model_dump())


# ========================================
# Type Aliases
# ========================================

WorkflowListItemResponse = WorkflowResponse

WorkflowDataResponse = V4WorkflowsWorkflowIdDataGet200Response

CreateWorkflowRequest = CreateWorkflowBody


class ListWorkflowsRequest(BaseModel):
    """Request to list workflows with optional filtering."""

    search: Optional[str] = None
    skip: Optional[int] = None
    limit: Optional[int] = None
    state: Optional[str] = None
    tags: Optional[List[str]] = None
    monitoring: Optional[str] = None
    update_interval: Optional[str] = None
    template_id: Optional[str] = None
    include_deleted: Optional[str] = None
    format: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


UpdateWorkflowRequest = V4WorkflowsWorkflowIdMetadataPutRequest

UpdateWorkflowResponse = V4WorkflowsWorkflowIdMetadataPut200Response

RunWorkflowResponse = V4WorkflowsWorkflowIdRunPut200Response


def _get_schema_types():
    """Lazy import of schema types to avoid circular dependency."""
    from ..schemas.schemas_acl import (
        ClassificationField,
        DataField,
        DataFieldExample,
        RawContentField,
        SchemaResponseSchemaInner,
    )

    return (
        ClassificationField,
        DataField,
        DataFieldExample,
        RawContentField,
        SchemaResponseSchemaInner,
    )


# Re-export schema builder models from schemas_acl (lazy)
def __getattr__(name: str):
    """Lazy import of schema types."""
    if name in (
        "ClassificationField",
        "DataField",
        "DataFieldExample",
        "RawContentField",
        "SchemaResponseSchemaInner",
    ):
        types = _get_schema_types()
        type_map = {
            "ClassificationField": types[0],
            "DataField": types[1],
            "DataFieldExample": types[2],
            "RawContentField": types[3],
            "SchemaResponseSchemaInner": types[4],
        }
        return type_map[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "WorkflowsApi",
    "CrawlApi",
    "WorkflowStateEnum",
    "WorkflowDisplayStateEnum",
    "JobStateEnum",
    "WorkflowResponse",
    "GetWorkflowResponse",
    "GetJobResponse",
    "WorkflowListItemResponse",
    "WorkflowDataResponse",
    "CreateWorkflowRequest",
    "ListWorkflowsRequest",
    "UpdateWorkflowRequest",
    "UpdateWorkflowResponse",
    "RunWorkflowResponse",
    "WorkflowWithEntityAndFields",
    "V4WorkflowsWorkflowIdGet200Response",
    "V4WorkflowsWorkflowIdDataGet200Response",
    "CreateWorkflowBody",
    "ClassificationField",
    "DataField",
    "DataFieldExample",
    "RawContentField",
    "SchemaResponseSchemaInner",
]
