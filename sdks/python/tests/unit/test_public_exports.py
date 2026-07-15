from kadoa_sdk import ExtractionOptions, ExtractOptions, FieldOptions, RunWorkflowOptions
from kadoa_sdk.schemas import (
    Category,
    ClassificationField,
    CreateSchemaRequest,
    DataField,
    FieldExample,
    SchemaField,
    UpdateSchemaRequest,
)


def test_documented_types_are_available_from_stable_facades() -> None:
    exported_types = (
        ExtractOptions,
        ExtractionOptions,
        FieldOptions,
        RunWorkflowOptions,
        Category,
        ClassificationField,
        CreateSchemaRequest,
        DataField,
        FieldExample,
        SchemaField,
        UpdateSchemaRequest,
    )
    assert all(exported_type is not None for exported_type in exported_types)
