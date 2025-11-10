"""Service for managing schemas"""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from ..client import KadoaClient

from ..core.exceptions import KadoaErrorCode, KadoaSdkError
from ..core.http import get_schemas_api
from ..core.logger import schemas as logger
from .schema_builder import SchemaBuilder
from .schemas_acl import (
    CreateSchemaRequest,
    SchemaResponse,
    SchemaResponseSchemaInner,
    SchemasApi,
    UpdateSchemaRequest,
)

debug = logger.debug


class SchemasService:
    """Service for managing schemas"""

    def __init__(self, client: "KadoaClient") -> None:
        self._client = client
        self._schemas_api: Optional[SchemasApi] = None

    @property
    def schemas_api(self) -> SchemasApi:
        """Get or create the schemas API client"""
        if self._schemas_api is None:
            self._schemas_api = get_schemas_api(self._client)
        return self._schemas_api

    def builder(self, entity_name: Optional[str] = None) -> "SchemaBuilderWithCreate":
        """Create a schema builder with fluent API and inline create support.

        Args:
            entity_name: Optional entity name to set on the builder

        Returns:
            SchemaBuilder instance with create method attached
        """
        return SchemaBuilderWithCreate(self, entity_name)

    def get_schema(self, schema_id: str) -> SchemaResponse:
        """Get a schema by ID

        Args:
            schema_id: Schema ID

        Returns:
            SchemaResponse: Schema data

        Raises:
            KadoaSdkError: If schema is not found
        """
        debug("Fetching schema with ID: %s", schema_id)

        response = self.schemas_api.v4_schemas_schema_id_get(schema_id=schema_id)
        schema_data = response.data

        if not schema_data:
            raise KadoaSdkError(
                f"Schema not found: {schema_id}",
                code=KadoaErrorCode.NOT_FOUND,
                details={"schemaId": schema_id},
            )

        # Convert SchemaDataResponseData to SchemaResponse (they have the same structure)
        return SchemaResponse(
            id=schema_data.id,
            name=schema_data.name,
            is_public=schema_data.is_public,
            var_schema=schema_data.var_schema,
            entity=schema_data.entity,
            description=schema_data.description,
        )

    def list_schemas(self) -> list[SchemaResponse]:
        """List all schemas

        Returns:
            List of SchemaResponse objects

        Raises:
            KadoaHttpError: If request fails
        """
        response = self.schemas_api.v4_schemas_get()
        return response.data

    def create_schema(self, body: CreateSchemaRequest) -> SchemaResponse:
        """Create a new schema

        Args:
            body: Create schema request body

        Returns:
            SchemaResponse: Created schema data

        Raises:
            KadoaSdkError: If schema creation fails
        """
        debug("Creating schema with name: %s", body.name)

        response = self.schemas_api.v4_schemas_post(create_schema_body=body)
        schema_id = response.schema_id

        if not schema_id:
            raise KadoaSdkError(
                "Failed to create schema",
                code=KadoaErrorCode.INTERNAL_ERROR,
            )

        # Fetch the created schema to return the full schema object
        return self.get_schema(schema_id)

    def update_schema(self, schema_id: str, body: UpdateSchemaRequest) -> SchemaResponse:
        """Update an existing schema

        Args:
            schema_id: Schema ID
            body: Update schema request body

        Returns:
            SchemaResponse: Updated schema data
        """
        debug("Updating schema with ID: %s", schema_id)

        self.schemas_api.v4_schemas_schema_id_put(schema_id=schema_id, update_schema_body=body)

        # Fetch the updated schema to return the full schema object
        return self.get_schema(schema_id)

    def delete_schema(self, schema_id: str) -> None:
        """Delete a schema

        Args:
            schema_id: Schema ID
        """
        debug("Deleting schema with ID: %s", schema_id)

        self.schemas_api.v4_schemas_schema_id_delete(schema_id=schema_id)


class SchemaBuilderWithCreate(SchemaBuilder):
    """SchemaBuilder with create method attached"""

    def __init__(self, service: SchemasService, entity_name: Optional[str] = None) -> None:
        super().__init__()
        self._service = service
        if entity_name:
            self.entity(entity_name)

    def create(self, name: Optional[str] = None) -> SchemaResponse:
        """Create the schema using the service

        Args:
            name: Optional schema name (uses entity name if not provided)

        Returns:
            SchemaResponse: Created schema data

        Raises:
            KadoaSdkError: If schema name is required but not provided
        """
        built = self.build()
        schema_name = name or built.get("entityName")

        if not schema_name:
            raise KadoaSdkError(
                "Schema name is required when entity name is not provided",
                code=KadoaErrorCode.VALIDATION_ERROR,
                details={"name": name},
            )

        # Wrap fields in SchemaResponseSchemaInner
        wrapped_fields = [
            SchemaResponseSchemaInner(actual_instance=field) for field in built["fields"]
        ]

        create_schema_body = CreateSchemaRequest(
            name=schema_name,
            fields=wrapped_fields,
            entity=built.get("entityName"),
        )

        return self._service.create_schema(create_schema_body)
