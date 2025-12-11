"""Schemas domain exports.

Public boundary for schema management functionality.
"""

# Schema builder types and class (owned by schema_builder.py)
from .schema_builder import (
    DataTypeNotRequiringExample,
    DataTypeRequiringExample,
    FieldOptions,
    FieldOptionsWithExample,
    FieldOptionsWithoutExample,
    SchemaBuilder,
)

# ACL types (owned by schemas_acl.py)
from .schemas_acl import (
    Category,
    CreateSchemaRequest,
    DataFieldFor,
    FieldExample,
    SchemaField,
    SchemaResponse,
    UpdateSchemaRequest,
)

# Service class
from .schemas_service import SchemasService

__all__ = [
    # Schema builder
    "DataTypeNotRequiringExample",
    "DataTypeRequiringExample",
    "FieldOptions",
    "FieldOptionsWithExample",
    "FieldOptionsWithoutExample",
    "SchemaBuilder",
    # ACL types
    "Category",
    "CreateSchemaRequest",
    "DataFieldFor",
    "FieldExample",
    "SchemaField",
    "SchemaResponse",
    "UpdateSchemaRequest",
    # Service
    "SchemasService",
]
