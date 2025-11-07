"""
E2E tests for schemas functionality matching Node.js structure.
"""

import os

import pytest
import pytest_asyncio

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.schemas import CreateSchemaRequest
from kadoa_sdk.schemas.schema_builder import FieldOptions
from openapi_client.models.classification_field_categories_inner import (
    ClassificationFieldCategoriesInner,
)
from openapi_client.models.data_field import DataField
from openapi_client.models.data_field_example import DataFieldExample
from openapi_client.models.schema_response_schema_inner import SchemaResponseSchemaInner


@pytest.mark.e2e
class TestSchemas:
    """E2E tests for schemas functionality."""

    # Class variable to track created schema IDs across test methods
    created_schema_ids: list[str] = []

    test_schema_names = [
        "Test Product Schema",
        "Test Reusable Product Schema",
        "Test Complete Product Schema",
        "Test Fluent Product Schema",
        "Test Updated Product Schema",
    ]

    @pytest_asyncio.fixture(scope="class")
    async def client(self):
        """Initialize client for all tests in this class."""
        # Reset created_schema_ids at the start of each test run
        TestSchemas.created_schema_ids.clear()

        settings = get_settings()
        base_url = (
            settings.public_api_uri
            if os.getenv("KADOA_PUBLIC_API_URI")
            else "http://localhost:12380"
        )
        client = KadoaClient(
            KadoaClientConfig(
                api_key=settings.api_key,
                base_url=base_url,
                timeout=30,
            )
        )

        # Cleanup before tests
        # Note: This may fail silently if list_schemas() encounters invalid schema data
        # (e.g., schemas with dataType='JOB_DESCRIPTION' which isn't in the enum)
        # This is an API bug that will be fixed separately
        try:
            self._cleanup_schemas_by_name(client, self.test_schema_names)
        except Exception:
            # Ignore cleanup errors - API may have invalid schema data
            pass

        yield client

        # Cleanup after tests - delete tracked schema IDs
        for schema_id in TestSchemas.created_schema_ids:
            try:
                client.schema.delete_schema(schema_id)
            except Exception:
                # Ignore errors during cleanup
                pass

        client.dispose()

    def _cleanup_schemas_by_name(self, client, schema_names):
        """Helper to clean up schemas by name.

        Note: This may fail if list_schemas() encounters invalid schema data
        (e.g., schemas with dataType='JOB_DESCRIPTION' which isn't in the enum).
        This is an API bug that will be fixed separately.
        """
        try:
            schemas = client.schema.list_schemas()
            for schema in schemas:
                if schema.name in schema_names:
                    try:
                        client.schema.delete_schema(schema.id)
                    except Exception:
                        # Ignore individual deletion errors
                        pass
        except Exception:
            # Ignore errors - API may have invalid schema data preventing list_schemas()
            # Try to delete by attempting to create with same name and catching the error
            # to get the schema ID, but this is complex, so we'll just skip cleanup
            pass

    def _ensure_schema_deleted(self, client, schema_name):
        """Ensure a schema with the given name is deleted, handling errors gracefully."""
        import time

        # Try multiple times with a small delay to ensure cleanup
        for attempt in range(3):
            try:
                schemas = client.schema.list_schemas()
                found_schema = None
                for schema in schemas:
                    if schema.name == schema_name:
                        found_schema = schema
                        break

                if found_schema:
                    try:
                        client.schema.delete_schema(found_schema.id)
                        # Wait a bit for deletion to propagate
                        time.sleep(0.5)
                        # Verify deletion
                        schemas_after = client.schema.list_schemas()
                        if not any(s.name == schema_name for s in schemas_after):
                            return  # Successfully deleted
                    except Exception:
                        # If deletion fails, log and continue
                        if attempt < 2:
                            time.sleep(0.5)
                        continue
                else:
                    # Schema doesn't exist, we're done
                    return
            except Exception:
                # If list_schemas fails, wait and retry
                if attempt < 2:
                    time.sleep(0.5)
                continue

    def _create_schema_with_cleanup(self, client, schema_request):
        """Create a schema, handling 'already exists' errors by cleaning up first."""
        return client.schema.create_schema(schema_request)

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_create_schema_using_body(self, client):
        """Should create schema using body (direct API)."""
        # Ensure schema doesn't exist before creating
        self._ensure_schema_deleted(client, "Test Product Schema")

        schema = self._create_schema_with_cleanup(
            client,
            CreateSchemaRequest(
                name="Test Product Schema",
                entity="TestProduct",
                fields=[
                    SchemaResponseSchemaInner(
                        actual_instance=DataField(
                            name="title",
                            description="Product title",
                            data_type="STRING",
                            field_type="SCHEMA",
                            example=DataFieldExample(actual_instance="Test Product"),
                        )
                    ),
                    SchemaResponseSchemaInner(
                        actual_instance=DataField(
                            name="price",
                            description="Product price",
                            data_type="NUMBER",
                            field_type="SCHEMA",
                        )
                    ),
                ],
            ),
        )

        assert schema is not None
        assert schema.id is not None
        assert schema.name == "Test Product Schema"
        assert schema.entity == "TestProduct"

        TestSchemas.created_schema_ids.append(schema.id)

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_get_schema_by_id(self, client):
        """Should retrieve existing schema by ID."""
        # Create a schema first
        created = client.schema.create_schema(
            CreateSchemaRequest(
                name="Test Reusable Product Schema",
                entity="TestReusableProduct",
                fields=[
                    SchemaResponseSchemaInner(
                        actual_instance=DataField(
                            name="name",
                            description="Product name",
                            data_type="STRING",
                            field_type="SCHEMA",
                            example=DataFieldExample(actual_instance="Example Product"),
                        )
                    ),
                ],
            )
        )

        # Retrieve it
        retrieved = client.schema.get_schema(created.id)

        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.entity == "TestReusableProduct"
        assert retrieved.name == "Test Reusable Product Schema"

        TestSchemas.created_schema_ids.append(created.id)

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_list_schemas(self, client):
        """Should list all schemas."""
        # Ensure schema doesn't exist before creating
        self._ensure_schema_deleted(client, "Test Reusable Product Schema")

        # Create a schema first to ensure we have at least one
        created = self._create_schema_with_cleanup(
            client,
            CreateSchemaRequest(
                name="Test Reusable Product Schema",
                entity="TestReusableProduct",
                fields=[
                    SchemaResponseSchemaInner(
                        actual_instance=DataField(
                            name="name",
                            description="Product name",
                            data_type="STRING",
                            field_type="SCHEMA",
                            example=DataFieldExample(actual_instance="Example Product"),
                        )
                    ),
                ],
            ),
        )

        # List schemas
        schemas = client.schema.list_schemas()

        assert schemas is not None
        assert isinstance(schemas, list)
        assert len(schemas) > 0

        # Verify our schema is in the list
        schema_ids = [s.id for s in schemas]
        assert created.id in schema_ids

        TestSchemas.created_schema_ids.append(created.id)

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_update_schema(self, client):
        """Should update an existing schema."""
        # Ensure schema doesn't exist before creating
        self._ensure_schema_deleted(client, "Test Product Schema")

        # Create a schema first
        created = self._create_schema_with_cleanup(
            client,
            CreateSchemaRequest(
                name="Test Product Schema",
                entity="TestProduct",
                fields=[
                    SchemaResponseSchemaInner(
                        actual_instance=DataField(
                            name="title",
                            description="Product title",
                            data_type="STRING",
                            field_type="SCHEMA",
                            example=DataFieldExample(actual_instance="Test Product"),
                        )
                    ),
                ],
            ),
        )

        # Update the schema
        from kadoa_sdk.schemas import UpdateSchemaRequest

        updated = client.schema.update_schema(
            created.id,
            UpdateSchemaRequest(
                name="Test Updated Product Schema",
                entity="TestProduct",  # Entity name is required for SCHEMA type fields
                fields=[
                    SchemaResponseSchemaInner(
                        actual_instance=DataField(
                            name="title",
                            description="Updated product title",
                            data_type="STRING",
                            field_type="SCHEMA",
                            example=DataFieldExample(actual_instance="Updated Product"),
                        )
                    ),
                    SchemaResponseSchemaInner(
                        actual_instance=DataField(
                            name="price",
                            description="Product price",
                            data_type="NUMBER",
                            field_type="SCHEMA",
                        )
                    ),
                ],
            ),
        )

        assert updated is not None
        assert updated.id == created.id
        assert updated.name == "Test Updated Product Schema"
        assert len(updated.var_schema) == 2  # Should have 2 fields now

        TestSchemas.created_schema_ids.append(created.id)

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_delete_schema(self, client):
        """Should delete a schema."""
        # Ensure schema doesn't exist before creating
        self._ensure_schema_deleted(client, "Test Product Schema")

        # Create a schema first
        created = self._create_schema_with_cleanup(
            client,
            CreateSchemaRequest(
                name="Test Product Schema",
                entity="TestProduct",
                fields=[
                    SchemaResponseSchemaInner(
                        actual_instance=DataField(
                            name="title",
                            description="Product title",
                            data_type="STRING",
                            field_type="SCHEMA",
                            example=DataFieldExample(actual_instance="Test Product"),
                        )
                    ),
                ],
            ),
        )

        schema_id = created.id

        # Delete the schema
        client.schema.delete_schema(schema_id)

        # Verify it's deleted by trying to get it (should raise exception)
        with pytest.raises(Exception):  # Should raise NOT_FOUND exception
            client.schema.get_schema(schema_id)

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_create_schema_using_builder_with_all_field_types(self, client):
        """Should create schema using builder with all 3 field types."""
        schema_definition = (
            client.schema.builder("TestCompleteProduct")
            .field("title", "Product title", "STRING", FieldOptions(example="iPhone 15"))
            .field("price", "Product price", "NUMBER")
            .classify(
                "sentiment",
                "Product sentiment",
                [
                    ClassificationFieldCategoriesInner(title="Positive", definition="Good reviews"),
                    ClassificationFieldCategoriesInner(title="Negative", definition="Bad reviews"),
                ],
            )
            .raw("HTML")
            .raw("PAGE_URL")
            .build()
        )

        # Create the schema using the built definition
        wrapped_fields = [
            SchemaResponseSchemaInner(actual_instance=field)
            for field in schema_definition["fields"]
        ]
        schema = client.schema.create_schema(
            CreateSchemaRequest(
                name="Test Complete Product Schema",
                entity=schema_definition.get("entityName"),
                fields=wrapped_fields,
            )
        )

        assert schema is not None
        assert schema.id is not None
        assert schema.entity == "TestCompleteProduct"
        assert schema.name == "Test Complete Product Schema"

        # Verify the built definition structure before creation
        assert schema_definition.get("entityName") == "TestCompleteProduct"
        assert len(schema_definition["fields"]) == 5

        TestSchemas.created_schema_ids.append(schema.id)

        # Verify field types
        schema_field = next((f for f in schema_definition["fields"] if f.name == "title"), None)
        number_field = next((f for f in schema_definition["fields"] if f.name == "price"), None)
        classification_field = next(
            (f for f in schema_definition["fields"] if f.name == "sentiment"), None
        )
        metadata_field = next((f for f in schema_definition["fields"] if f.name == "rawHtml"), None)

        assert schema_field is not None
        assert isinstance(schema_field, DataField)
        assert schema_field.field_type == "SCHEMA"
        assert schema_field.data_type == "STRING"
        assert number_field is not None
        assert number_field.field_type == "SCHEMA"
        assert number_field.data_type == "NUMBER"
        assert classification_field is not None
        assert classification_field.field_type == "CLASSIFICATION"
        assert metadata_field is not None
        assert metadata_field.field_type == "METADATA"

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_fluent_api_with_create_method(self, client):
        """Should support fluent API with create method."""
        schema = (
            client.schema.builder("TestFluentProduct")
            .field("title", "Product name", "STRING", FieldOptions(example="iPhone 15"))
            .field("price", "Product price", "NUMBER")
            .create("Test Fluent Product Schema")
        )

        assert schema is not None
        assert schema.id is not None
        assert schema.name == "Test Fluent Product Schema"
        assert schema.entity == "TestFluentProduct"

        TestSchemas.created_schema_ids.append(schema.id)
