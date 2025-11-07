"""Schemas domain ACL.

Wraps generated SchemasApi requests/responses and normalizes types.
Downstream code must import from this module instead of `openapi_client/**`.

NOTE: This ACL uses type aliases instead of explicit classes/interfaces because:
- The generated types (CreateSchemaBody, UpdateSchemaBody, SchemaResponse) are flat interfaces
- They contain only primitive fields and simple nested types (SchemaResponseSchemaInner)
- No enums or complex nested structures that could leak implementation details
- The types are stable and unlikely to change in structure
"""

from typing import TYPE_CHECKING

from openapi_client.api.schemas_api import SchemasApi
from openapi_client.models.classification_field import ClassificationField
from openapi_client.models.classification_field_categories_inner import (
    ClassificationFieldCategoriesInner,
)
from openapi_client.models.create_schema_body import CreateSchemaBody
from openapi_client.models.data_field import DataField
from openapi_client.models.data_field_example import DataFieldExample
from openapi_client.models.raw_content_field import RawContentField
from openapi_client.models.schema_response import SchemaResponse
from openapi_client.models.schema_response_schema_inner import SchemaResponseSchemaInner
from openapi_client.models.update_schema_body import UpdateSchemaBody

if TYPE_CHECKING:
    pass

__all__ = ["SchemasApi"]

CreateSchemaRequest = CreateSchemaBody

UpdateSchemaRequest = UpdateSchemaBody

SchemaField = SchemaResponseSchemaInner

FieldExample = DataFieldExample

Category = ClassificationFieldCategoriesInner

__all__ = [
    "SchemasApi",
    "CreateSchemaRequest",
    "UpdateSchemaRequest",
    "SchemaResponse",
    "SchemaField",
    "SchemaResponseSchemaInner",
    "ClassificationField",
    "DataField",
    "DataFieldExample",
    "RawContentField",
    "FieldExample",
    "Category",
]
