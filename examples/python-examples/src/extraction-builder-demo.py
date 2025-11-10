#!/usr/bin/env python3
"""
Extraction builder demo showing different extraction patterns.
"""

import sys

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.extraction.types import ExtractOptions
from kadoa_sdk.schemas.schema_builder import FieldOptions
from openapi_client.models.classification_field_categories_inner import (
    ClassificationFieldCategoriesInner,
)


def main():
    settings = get_settings()

    client = KadoaClient(
        KadoaClientConfig(
            api_key=settings.api_key,
            timeout=300000,
        )
    )

    try:
        print("\n=== Extraction Builder Demo ===\n")

        # 1. Auto-detection (simplest)
        print("1. Auto-detection (no extraction parameter):")
        auto_extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Auto Detection Demo",
                )
            )
            .bypass_preview()
            .set_interval({"interval": "ONLY_ONCE"})
            .create()
        )
        print(f"✓ Created workflow: {auto_extraction.workflow_id}")

        # 2. Raw extraction (markdown)
        print("\n2. Raw extraction (markdown and url):")
        raw_extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Raw Markdown Demo",
                    extraction=lambda builder: builder.raw("MARKDOWN").raw("PAGE_URL"),
                )
            )
            .bypass_preview()
            .set_interval({"interval": "ONLY_ONCE"})
            .create()
        )
        print(f"✓ Created workflow: {raw_extraction.workflow_id}")

        # 3. Custom schema with fields
        print("\n3. Custom schema with structured fields:")
        schema_extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Custom Schema Demo",
                    extraction=lambda builder: (
                        builder.entity("Product")
                        .field(
                            "title",
                            "Product name",
                            "STRING",
                            FieldOptions(example="Example Product"),
                        )
                        .field("price", "Product price", "MONEY")
                    ),
                )
            )
            .bypass_preview()
            .set_interval({"interval": "ONLY_ONCE"})
            .create()
        )
        print(f"✓ Created workflow: {schema_extraction.workflow_id}")

        # 4. Hybrid (schema + raw content)
        print("\n4. Hybrid extraction (schema + raw HTML):")
        hybrid_extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Hybrid Demo",
                    extraction=lambda builder: (
                        builder.entity("Product")
                        .field(
                            "title",
                            "Product name",
                            "STRING",
                            FieldOptions(example="Example Product"),
                        )
                        .field("price", "Product price", "MONEY")
                        .raw("HTML")
                    ),
                )
            )
            .bypass_preview()
            .set_interval({"interval": "ONLY_ONCE"})
            .create()
        )
        print(f"✓ Created workflow: {hybrid_extraction.workflow_id}")

        # 5. Classification field
        print("\n5. Classification field:")
        classification_extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Classification Demo",
                    extraction=lambda builder: builder.classify(
                        "category",
                        "Product category",
                        [
                            ClassificationFieldCategoriesInner(
                                title="Electronics",
                                definition="Electronic devices and gadgets",
                            ),
                            ClassificationFieldCategoriesInner(
                                title="Clothing", definition="Apparel and fashion items"
                            ),
                            ClassificationFieldCategoriesInner(
                                title="Other", definition="Other products"
                            ),
                        ],
                    ),
                )
            )
            .bypass_preview()
            .set_interval({"interval": "ONLY_ONCE"})
            .create()
        )
        print(f"✓ Created workflow: {classification_extraction.workflow_id}")

        print("\n=== All demos completed successfully! ===\n")
    finally:
        client.dispose()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        sys.exit(1)
