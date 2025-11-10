from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, TypedDict, Union

from pydantic import BaseModel, field_validator

from ..core.exceptions import KadoaErrorCode, KadoaSdkError
from .schemas_acl import (
    Category,
    ClassificationField,
    DataField,
    DataFieldExample,
    FieldExample,
    RawContentField,
)

# Data types that require examples
TYPES_REQUIRING_EXAMPLE = ["STRING", "IMAGE", "LINK", "OBJECT", "ARRAY"]

# Valid data types
DataType = str  # STRING, NUMBER, BOOLEAN, DATE, DATETIME, MONEY, IMAGE, LINK, OBJECT, ARRAY
RawFormat = str  # HTML, MARKDOWN, PAGE_URL
SchemaField = Union[DataField, ClassificationField, RawContentField]


class BuiltSchema(TypedDict, total=False):
    """Built schema structure returned by SchemaBuilder.build()"""

    entityName: Optional[str]
    fields: List[SchemaField]


class FieldOptions(BaseModel):
    """Optional configuration for schema fields"""

    example: Optional[Union[str, List[str], FieldExample]] = None
    is_key: Optional[bool] = None

    @field_validator("example", mode="before")
    @classmethod
    def convert_example(cls, v: Any) -> Optional[Union[str, List[str], FieldExample]]:
        """Convert string/list examples to DataFieldExample instances"""
        if v is None:
            return None
        if isinstance(v, (str, list)):
            return DataFieldExample(actual_instance=v)
        return v


class SchemaBuilder:
    """Builder for defining custom schemas with fields"""

    FIELD_NAME_PATTERN = re.compile(r"^[A-Za-z0-9]+$")

    def __init__(self) -> None:
        self.fields: List[SchemaField] = []
        self.entity_name: Optional[str] = None

    def _has_schema_fields(self) -> bool:
        """Check if any fields are schema fields"""
        return any(getattr(field, "field_type", None) == "SCHEMA" for field in self.fields)

    def entity(self, entity_name: str) -> "SchemaBuilder":
        """Set entity name"""
        self.entity_name = entity_name
        return self

    def field(
        self,
        name: str,
        description: str,
        data_type: DataType,
        options: Optional[FieldOptions] = None,
    ) -> "SchemaBuilder":
        """
        Add a structured field to the schema

        Args:
            name: Field name (alphanumeric only)
            description: Field description
            data_type: Data type (STRING, NUMBER, BOOLEAN, etc.)
            options: Optional field configuration
        """
        self._validate_field_name(name)

        requires_example = data_type in TYPES_REQUIRING_EXAMPLE
        if requires_example and not (options and options.example):
            raise KadoaSdkError(
                f'Field "{name}" with type {data_type} requires an example',
                code=KadoaErrorCode.VALIDATION_ERROR,
                details={"name": name, "dataType": data_type},
            )

        example = None
        if options and options.example:
            if isinstance(options.example, (str, list)):
                example = DataFieldExample(actual_instance=options.example)
            else:
                example = options.example

        field = DataField(
            name=name,
            description=description,
            data_type=data_type,
            field_type="SCHEMA",
            example=example,
            is_key=options.is_key if options else None,
        )
        self.fields.append(field)
        return self

    def classify(
        self,
        name: str,
        description: str,
        categories: List[Category],
    ) -> "SchemaBuilder":
        """
        Add a classification field to categorize content

        Args:
            name: Field name (alphanumeric only)
            description: Field description
            categories: Array of category definitions
        """
        self._validate_field_name(name)

        field = ClassificationField(
            name=name,
            description=description,
            field_type="CLASSIFICATION",
            categories=categories,
        )
        self.fields.append(field)
        return self

    def raw(self, name: Union[RawFormat, List[RawFormat]]) -> "SchemaBuilder":
        """
        Add raw page content to extract

        Args:
            name: Raw content format(s): "html", "markdown", or "page_url" (case-insensitive)
        """
        names = name if isinstance(name, list) else [name]

        for raw_name in names:
            # Normalize to lowercase for processing
            raw_lower = raw_name.lower()
            # Split by underscore and convert to camelCase
            parts = raw_lower.split("_")
            camel_case = parts[0] + "".join(word.capitalize() for word in parts[1:])
            # Capitalize first letter: "html" -> "Html", "pageUrl" -> "PageUrl"
            field_name = f"raw{camel_case.capitalize()}"

            # Check if field already exists
            if any(getattr(field, "name", None) == field_name for field in self.fields):
                continue

            # Normalize metadata_key to uppercase to match enum requirements
            # Accept: html, markdown, page_url -> HTML, MARKDOWN, PAGE_URL
            metadata_key_upper = raw_lower.upper()

            field = RawContentField(
                name=field_name,
                description=f"Raw page content in {raw_lower.upper()} format",
                field_type="METADATA",
                metadata_key=metadata_key_upper,
            )
            self.fields.append(field)
        return self

    def build(self) -> BuiltSchema:
        """
        Build schema with validation

        Returns:
            BuiltSchema with entityName and fields
        """
        if self._has_schema_fields() and not self.entity_name:
            raise KadoaSdkError(
                "Entity name is required when schema fields are present",
                code=KadoaErrorCode.VALIDATION_ERROR,
                details={"entityName": self.entity_name},
            )

        return {
            "entityName": self.entity_name,
            "fields": self.fields,
        }

    def _validate_field_name(self, name: str) -> None:
        """Validate field name"""
        if not self.FIELD_NAME_PATTERN.match(name):
            raise KadoaSdkError(
                f'Field name "{name}" must be alphanumeric only '
                "(no underscores or special characters)",
                code=KadoaErrorCode.VALIDATION_ERROR,
                details={"name": name, "pattern": "^[A-Za-z0-9]+$"},
            )

        lower_name = name.lower()
        if any(getattr(field, "name", "").lower() == lower_name for field in self.fields):
            raise KadoaSdkError(
                f'Duplicate field name: "{name}"',
                code=KadoaErrorCode.VALIDATION_ERROR,
                details={"name": name},
            )
