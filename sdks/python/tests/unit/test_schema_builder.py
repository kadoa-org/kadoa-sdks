"""
Unit tests for SchemaBuilder validation.
"""

import pytest

from kadoa_sdk.core.exceptions import KadoaSdkError
from kadoa_sdk.schemas import SchemaBuilder


@pytest.mark.unit
class TestSchemaBuilderValidation:
    """Validation tests for SchemaBuilder."""

    def test_throws_error_for_duplicate_field_names_case_insensitive(self):
        """Should throw error for duplicate field names (case-insensitive)."""
        with pytest.raises(KadoaSdkError):
            SchemaBuilder().entity("Product").field(
                "title", "Title", "STRING", example="Example"
            ).field("Title", "Title 2", "STRING", example="Example")

    def test_throws_error_for_string_field_without_example(self):
        """Should throw error for STRING field without example."""
        with pytest.raises(KadoaSdkError):
            SchemaBuilder().entity("Product").field("title", "Title", "STRING")

    def test_throws_error_for_image_field_without_example(self):
        """Should throw error for IMAGE field without example."""
        with pytest.raises(KadoaSdkError):
            SchemaBuilder().entity("Product").field("image", "Image", "IMAGE")

    def test_throws_error_for_link_field_without_example(self):
        """Should throw error for LINK field without example."""
        with pytest.raises(KadoaSdkError):
            SchemaBuilder().entity("Product").field("link", "Link", "LINK")

    def test_throws_error_for_object_field_without_example(self):
        """Should throw error for OBJECT field without example."""
        with pytest.raises(KadoaSdkError):
            SchemaBuilder().entity("Product").field("metadata", "Metadata", "OBJECT")

    def test_throws_error_for_array_field_without_example(self):
        """Should throw error for ARRAY field without example."""
        with pytest.raises(KadoaSdkError):
            SchemaBuilder().entity("Product").field("tags", "Tags", "ARRAY")

    def test_allows_number_field_without_example(self):
        """Should allow NUMBER field without example."""
        SchemaBuilder().entity("Product").field("price", "Price", "NUMBER")

    def test_allows_boolean_field_without_example(self):
        """Should allow BOOLEAN field without example."""
        SchemaBuilder().entity("Product").field("inStock", "In Stock", "BOOLEAN")


@pytest.mark.unit
class TestSchemaBuilderFieldBuilding:
    """Field building tests for SchemaBuilder."""

    def test_creates_schema_fields_correctly(self):
        """Should create schema fields correctly."""
        builder = (
            SchemaBuilder()
            .entity("Product")
            .field("title", "Product name", "STRING", example="Example")
            .field("price", "Product price", "MONEY")
        )

        assert len(builder.fields) == 2
        assert builder.fields[0].name == "title"
        assert builder.fields[0].description == "Product name"
        assert builder.fields[0].data_type == "STRING"
        assert builder.fields[0].field_type == "SCHEMA"
        assert builder.fields[1].name == "price"
        assert builder.fields[1].description == "Product price"
        assert builder.fields[1].data_type == "MONEY"
        assert builder.fields[1].field_type == "SCHEMA"

    def test_creates_classification_fields_correctly(self):
        """Should create classification fields correctly."""
        builder = SchemaBuilder().entity("Article").classify(
            "sentiment",
            "Article sentiment",
            [
                {"title": "Positive", "definition": "Optimistic tone"},
                {"title": "Negative", "definition": "Critical tone"},
            ],
        )

        assert len(builder.fields) == 1
        assert builder.fields[0].name == "sentiment"
        assert builder.fields[0].description == "Article sentiment"
        assert builder.fields[0].field_type == "CLASSIFICATION"
        assert len(builder.fields[0].categories) == 2

    def test_creates_raw_metadata_fields_correctly(self):
        """Should create raw metadata fields correctly."""
        builder = SchemaBuilder().raw("MARKDOWN")

        assert len(builder.fields) == 1
        assert builder.fields[0].name == "rawMarkdown"
        assert builder.fields[0].description == "Raw page content in MARKDOWN format"
        assert builder.fields[0].field_type == "METADATA"
        assert builder.fields[0].metadata_key == "MARKDOWN"

    def test_creates_multiple_raw_fields_at_once(self):
        """Should create multiple raw fields at once."""
        builder = SchemaBuilder().raw(["HTML", "MARKDOWN", "PAGE_URL"])

        assert len(builder.fields) == 3
        assert builder.fields[0].name == "rawHtml"
        assert builder.fields[1].name == "rawMarkdown"
        assert builder.fields[2].name == "rawPageurl"

    def test_prevents_duplicate_raw_fields(self):
        """Should prevent duplicate raw fields."""
        builder = SchemaBuilder().raw("MARKDOWN").raw("MARKDOWN")

        assert len(builder.fields) == 1

    def test_combines_schema_fields_with_raw_content(self):
        """Should combine schema fields with raw content."""
        builder = (
            SchemaBuilder()
            .entity("Product")
            .field("title", "Product name", "STRING", example="Example")
            .raw("HTML")
        )

        assert len(builder.fields) == 2
        assert builder.fields[0].field_type == "SCHEMA"
        assert builder.fields[1].field_type == "METADATA"


@pytest.mark.unit
class TestSchemaBuilderState:
    """Builder state tests for SchemaBuilder."""

    def test_returns_schema_name_when_set(self):
        """Should return schema name when set."""
        builder = SchemaBuilder().entity("Product")
        assert builder.entity_name == "Product"

    def test_raw_only_extraction_has_no_schema_name(self):
        """Raw-only extraction should have no schema name."""
        builder = SchemaBuilder().raw("MARKDOWN")
        assert builder.entity_name is None


@pytest.mark.unit
class TestSchemaBuilderEntityRequirement:
    """Entity requirement tests for SchemaBuilder."""

    def test_allows_raw_only_schema_without_entity(self):
        """Should allow raw-only schema without entity."""
        result = SchemaBuilder().raw("MARKDOWN").build()
        assert result is not None

    def test_allows_classification_only_schema_without_entity(self):
        """Should allow classification-only schema without entity."""
        result = (
            SchemaBuilder()
            .classify(
                "sentiment",
                "Sentiment",
                [{"title": "Positive", "definition": "Good"}],
            )
            .build()
        )
        assert result is not None

    def test_allows_raw_and_classification_schema_without_entity(self):
        """Should allow raw and classification schema without entity."""
        result = (
            SchemaBuilder()
            .raw("HTML")
            .classify(
                "category",
                "Category",
                [{"title": "Tech", "definition": "Technology"}],
            )
            .build()
        )
        assert result is not None

    def test_requires_entity_when_schema_fields_are_present(self):
        """Should require entity when schema fields are present."""
        with pytest.raises(KadoaSdkError):
            SchemaBuilder().field("title", "Title", "STRING", example="Test").build()

    def test_requires_entity_when_mixing_schema_with_other_fields(self):
        """Should require entity when mixing schema with other fields."""
        with pytest.raises(KadoaSdkError):
            (
                SchemaBuilder()
                .field("title", "Title", "STRING", example="Test")
                .raw("HTML")
                .build()
            )


@pytest.mark.unit
class TestSchemaBuilderKeyFieldOption:
    """Key field option tests for SchemaBuilder."""

    def test_sets_is_key_option_correctly(self):
        """Should set isKey option correctly."""
        builder = SchemaBuilder().entity("Product").field(
            "id", "Product ID", "STRING", example="12345", is_key=True
        )
        field = builder.fields[0]
        assert field.is_key is True
