"""PY-SCHEMAS: sdks/schemas.mdx snippets"""

import pytest
from kadoa_sdk.extraction.types import ExtractOptions
from kadoa_sdk.schemas.schema_builder import FieldOptions
from kadoa_sdk.schemas.schemas_acl import (
    Category,
    ClassificationField,
    CreateSchemaRequest,
    DataField,
    FieldExample,
    RawContentField,
    SchemaField,
    UpdateSchemaRequest,
)
from tests.utils.cleanup_helpers import delete_schema_by_name, delete_workflow_by_name
from tests.utils.seeder import seed_schema


class TestSchemasSnippets:

    @pytest.mark.e2e
    @pytest.mark.timeout(300)
    def test_schemas_001_builder_api(self, client):
        """PY-SCHEMAS-001: Working with schemas using builder API"""
        workflow_name = "Product Extraction"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-SCHEMAS-001
        extract_options = ExtractOptions(
            urls=["https://sandbox.kadoa.com/ecommerce"],
            name="Product Extraction",
            extraction=lambda builder: builder.entity("Product")
            .field("title", "Product name", "STRING", FieldOptions(example="Laptop"))
            .field("price", "Product price", "MONEY")
            .field("inStock", "Availability", "BOOLEAN")
            .field("rating", "Star rating 1-5", "NUMBER"),
        )

        extraction = client.extract(extract_options).create()
        print(f"Extraction created successfully: {extraction}")
        # @docs-end PY-SCHEMAS-001

        assert extraction.workflow_id is not None

        # Cleanup
        if extraction.workflow_id:
            client.workflow.delete(extraction.workflow_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(120)
    def test_schemas_002_create_schema(self, client):
        """PY-SCHEMAS-002: Create a schema"""
        schema_name = "Product Schema"
        delete_schema_by_name(client, schema_name)

        # @docs-start PY-SCHEMAS-002
        # Create field objects
        fields = [
            SchemaField(
                actual_instance=DataField(
                    name="title",
                    description="Product name",
                    fieldType="SCHEMA",
                    dataType="STRING",
                    example=FieldExample(actual_instance="iPhone 15 Pro"),
                )
            ),
            SchemaField(
                actual_instance=DataField(
                    name="price",
                    description="Product price",
                    fieldType="SCHEMA",
                    dataType="MONEY",
                )
            ),
            SchemaField(
                actual_instance=DataField(
                    name="inStock",
                    description="Availability",
                    fieldType="SCHEMA",
                    dataType="BOOLEAN",
                )
            ),
            SchemaField(
                actual_instance=DataField(
                    name="rating",
                    description="Star rating",
                    fieldType="SCHEMA",
                    dataType="NUMBER",
                )
            ),
        ]

        # Create schema request
        create_request = CreateSchemaRequest(
            name="Product Schema",
            entity="Product",
            fields=fields,
        )

        schema = client.schema.create_schema(create_request)

        print("Schema created:", schema.id)
        # @docs-end PY-SCHEMAS-002

        assert schema.id is not None

        # Cleanup
        if schema.id:
            client.schema.delete_schema(schema.id)

    @pytest.mark.e2e
    @pytest.mark.timeout(60)
    def test_schemas_003_get_schema(self, client):
        """PY-SCHEMAS-003: Get a schema"""
        schema_name = "Test Schema - PY-SCHEMAS-003"
        delete_schema_by_name(client, schema_name)

        # Create a schema first
        fields = [
            SchemaField(
                actual_instance=DataField(
                    name="title",
                    description="Product name",
                    fieldType="SCHEMA",
                    dataType="STRING",
                    example=FieldExample(actual_instance="Sample Product"),
                )
            ),
        ]
        create_request = CreateSchemaRequest(name=schema_name, entity="Product", fields=fields)
        created_schema = client.schema.create_schema(create_request)
        schema_id = created_schema.id

        # @docs-start PY-SCHEMAS-003
        schema = client.schema.get_schema(schema_id)

        print(schema.name)
        print(schema.entity)
        print(schema.var_schema)  # Array of field definitions
        # @docs-end PY-SCHEMAS-003
        assert schema.name is not None

        # Cleanup
        if schema_id:
            client.schema.delete_schema(schema_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(60)
    def test_schemas_004_delete_schema(self, client):
        """PY-SCHEMAS-004: Delete a schema"""
        schema_name = "Test Schema - PY-SCHEMAS-004"
        delete_schema_by_name(client, schema_name)

        # Create a schema to delete
        fields = [
            SchemaField(
                actual_instance=DataField(
                    name="title",
                    description="Product name",
                    fieldType="SCHEMA",
                    dataType="STRING",
                    example=FieldExample(actual_instance="Sample Product"),
                )
            ),
        ]
        create_request = CreateSchemaRequest(name=schema_name, entity="Product", fields=fields)
        created_schema = client.schema.create_schema(create_request)
        schema_id = created_schema.id

        # @docs-start PY-SCHEMAS-004
        client.schema.delete_schema(schema_id)
        # @docs-end PY-SCHEMAS-004

        # Verify deletion (best-effort)
        try:
            client.schema.get_schema(schema_id)
            raise AssertionError("Schema should have been deleted")
        except Exception:
            pass

    @pytest.mark.e2e
    @pytest.mark.timeout(300)
    def test_schemas_005_use_saved_schema(self, client):
        """PY-SCHEMAS-005: Use a saved schema"""
        workflow_name = "Product Extraction - PY-SCHEMAS-005"
        delete_workflow_by_name(client, workflow_name)

        # Setup: get or create schema (idempotent)
        result = seed_schema(
            {
                "name": "Test Schema - PY-SCHEMAS-005",
                "entity": "Product",
                "fields": [
                    {
                        "name": "title",
                        "description": "Product name",
                        "fieldType": "SCHEMA",
                        "dataType": "STRING",
                        "example": "Sample Product",
                    },
                ],
            },
            client,
        )
        schema_id = result["schema_id"]

        # @docs-start PY-SCHEMAS-005
        extract_options = ExtractOptions(
            urls=["https://sandbox.kadoa.com/ecommerce"],
            name="Product Extraction - PY-SCHEMAS-005",
            extraction=lambda _: {"schemaId": schema_id},
        )

        extraction = client.extract(extract_options).create()

        run_result = extraction.run()
        print("Extraction completed:", run_result)
        # @docs-end PY-SCHEMAS-005

        assert extraction.workflow_id is not None

        # Cleanup - only delete workflow, schema is managed by seeder
        if extraction.workflow_id:
            try:
                client.workflow.delete(extraction.workflow_id)
            except Exception as e:
                print(f"Warning: Failed to delete workflow: {e}")

    @pytest.mark.e2e
    @pytest.mark.timeout(120)
    def test_schemas_006_classification_fields(self, client):
        """PY-SCHEMAS-006: Classification fields"""
        schema_name = "Article Schema"
        delete_schema_by_name(client, schema_name)

        # @docs-start PY-SCHEMAS-006
        # Create categories
        categories = [
            Category(title="Technology", definition="Tech news and updates"),
            Category(title="Business", definition="Business and finance"),
            Category(title="Sports", definition="Sports coverage"),
        ]

        # Create fields
        fields = [
            SchemaField(
                actual_instance=DataField(
                    name="title",
                    description="Article headline",
                    fieldType="SCHEMA",
                    dataType="STRING",
                    example=FieldExample(actual_instance="Breaking News"),
                )
            ),
            SchemaField(
                actual_instance=ClassificationField(
                    name="category",
                    description="Article category",
                    fieldType="CLASSIFICATION",
                    categories=categories,
                )
            ),
        ]

        # Create schema request
        create_request = CreateSchemaRequest(
            name="Article Schema",
            entity="Article",
            fields=fields,
        )

        schema = client.schema.create_schema(create_request)
        print("Schema with classification created:", schema.id)
        # @docs-end PY-SCHEMAS-006

        assert schema.id is not None

        # Cleanup
        if schema.id:
            client.schema.delete_schema(schema.id)

    @pytest.mark.e2e
    @pytest.mark.timeout(120)
    def test_schemas_007_metadata_fields(self, client):
        """PY-SCHEMAS-007: Metadata fields (raw content)"""
        schema_name = "Article with Raw Content"
        delete_schema_by_name(client, schema_name)

        # @docs-start PY-SCHEMAS-007
        # Create fields
        fields = [
            SchemaField(
                actual_instance=DataField(
                    name="title",
                    description="Article headline",
                    fieldType="SCHEMA",
                    dataType="STRING",
                    example=FieldExample(actual_instance="Latest News"),
                )
            ),
            SchemaField(
                actual_instance=RawContentField(
                    name="rawMarkdown",
                    description="Page content as Markdown",
                    fieldType="METADATA",
                    metadataKey="MARKDOWN",
                )
            ),
            SchemaField(
                actual_instance=RawContentField(
                    name="rawHtml",
                    description="Page HTML source",
                    fieldType="METADATA",
                    metadataKey="HTML",
                )
            ),
            SchemaField(
                actual_instance=RawContentField(
                    name="pageUrl",
                    description="Page URL",
                    fieldType="METADATA",
                    metadataKey="PAGE_URL",
                )
            ),
        ]

        # Create schema request
        create_request = CreateSchemaRequest(
            name="Article with Raw Content",
            entity="Article",
            fields=fields,
        )

        schema = client.schema.create_schema(create_request)
        print("Schema with metadata fields created:", schema.id)
        # @docs-end PY-SCHEMAS-007

        assert schema.id is not None

        # Cleanup
        if schema.id:
            client.schema.delete_schema(schema.id)

    @pytest.mark.e2e
    @pytest.mark.timeout(120)
    def test_schemas_008_update_schema(self, client):
        """PY-SCHEMAS-008: Update schema"""
        schema_name = "Test Schema - PY-SCHEMAS-008"
        updated_name = "Updated Product Schema"
        delete_schema_by_name(client, schema_name)
        delete_schema_by_name(client, updated_name)

        # Setup: create schema to update
        created = client.schema.create_schema(
            CreateSchemaRequest(
                name=schema_name,
                entity="TestProduct",
                fields=[
                    SchemaField(
                        actual_instance=DataField(
                            name="title",
                            description="Product name",
                            fieldType="SCHEMA",
                            dataType="STRING",
                            example=FieldExample(actual_instance="Test Product"),
                        )
                    ),
                ],
            )
        )
        schema_id = created.id

        # @docs-start PY-SCHEMAS-008
        update_request = UpdateSchemaRequest(
            name="Updated Product Schema",
            entity="Product",
            fields=[
                SchemaField(
                    actual_instance=DataField(
                        name="title",
                        description="Product name",
                        fieldType="SCHEMA",
                        dataType="STRING",
                        example=FieldExample(actual_instance="MacBook Pro"),
                    )
                ),
                SchemaField(
                    actual_instance=DataField(
                        name="price",
                        description="Product price in USD",
                        fieldType="SCHEMA",
                        dataType="MONEY",
                    )
                ),
                SchemaField(
                    actual_instance=DataField(
                        name="sku",
                        description="Stock keeping unit",
                        fieldType="SCHEMA",
                        dataType="STRING",
                        example=FieldExample(actual_instance="SKU-123"),
                    )
                ),
            ],
        )

        updated = client.schema.update_schema(schema_id, update_request)
        print("Schema updated:", updated.id)
        # @docs-end PY-SCHEMAS-008

        assert updated.id is not None

        # Cleanup
        if updated.id:
            client.schema.delete_schema(updated.id)
