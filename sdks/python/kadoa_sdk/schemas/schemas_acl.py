"""Schemas domain ACL.

Wraps generated SchemasApi requests/responses and normalizes types.
Downstream code must import from this module instead of `openapi_client/**`.

NOTE: This ACL uses type aliases instead of explicit classes/interfaces because:
- The generated types (CreateSchemaBody, UpdateSchemaBody, SchemaResponse) are flat interfaces
- They contain only primitive fields and simple nested types (SchemaResponseSchemaInner)
- No enums or complex nested structures that could leak implementation details
- The types are stable and unlikely to change in structure
"""

from typing import TYPE_CHECKING, Literal, Optional, TypedDict, Union

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

# ========================================
# Type-Safe Field Construction
# ========================================

DataType = Literal[
    "STRING", "NUMBER", "BOOLEAN", "DATE", "DATETIME", "MONEY", "IMAGE", "LINK", "OBJECT", "ARRAY"
]

DataTypeRequiringExample = Literal["STRING", "IMAGE", "LINK", "OBJECT", "ARRAY"]
DataTypeNotRequiringExample = Literal["NUMBER", "BOOLEAN", "DATE", "DATETIME", "MONEY"]


class _DataFieldBaseRequired(TypedDict):
    """Required fields for DataFieldFor"""

    dataType: DataType
    name: str
    description: str


class _DataFieldBaseOptional(TypedDict, total=False):
    """Optional fields for DataFieldFor"""

    fieldType: str
    isKey: bool


class DataFieldForRequiringExample(_DataFieldBaseRequired, _DataFieldBaseOptional):
    """DataField with required example"""

    example: DataFieldExample


class DataFieldForNotRequiringExample(_DataFieldBaseRequired, _DataFieldBaseOptional):
    """DataField with optional example"""

    example: Optional[DataFieldExample]


DataFieldFor = Union[DataFieldForRequiringExample, DataFieldForNotRequiringExample]
"""
Type-safe DataField with conditional example requirement.
- example is required for STRING, IMAGE, LINK, OBJECT, ARRAY
- example is optional for NUMBER, BOOLEAN, DATE, DATETIME, MONEY
"""


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
    "DataFieldFor",
    "DataType",
    "DataTypeRequiringExample",
    "DataTypeNotRequiringExample",
]
