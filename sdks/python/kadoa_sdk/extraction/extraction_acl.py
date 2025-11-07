"""Extraction/Workflows domain ACL.

Wraps generated WorkflowsApi, CrawlApi requests/responses and normalizes types.
Downstream code must import from this module instead of `openapi_client/**`.
"""

from typing import TYPE_CHECKING

try:  # pragma: no cover - compatibility shim for generator rename
    from openapi_client.api.crawler_api import CrawlerApi as CrawlApi  # type: ignore[attr-defined]
except ImportError:  # pragma: no cover
    from openapi_client.api.crawl_api import CrawlApi  # type: ignore[attr-defined]

from openapi_client.api.workflows_api import WorkflowsApi
from openapi_client.models.create_workflow_body import CreateWorkflowBody
from openapi_client.models.v4_workflows_workflow_id_data_get200_response import (
    V4WorkflowsWorkflowIdDataGet200Response,
)
from openapi_client.models.v4_workflows_workflow_id_get200_response import (
    V4WorkflowsWorkflowIdGet200Response,
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

WorkflowResponse = V4WorkflowsWorkflowIdGet200Response

WorkflowDataResponse = V4WorkflowsWorkflowIdDataGet200Response

CreateWorkflowRequest = CreateWorkflowBody


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
    "WorkflowResponse",
    "WorkflowDataResponse",
    "CreateWorkflowRequest",
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
