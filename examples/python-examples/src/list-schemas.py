#!/usr/bin/env python3
"""
Run extraction example for Kadoa SDK.
"""

import sys

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.extraction.types import ExtractionOptions, FetchDataOptions


def main():
    settings = get_settings()

    client = KadoaClient(
        KadoaClientConfig(
            api_key=settings.api_key,
        )
    )

    try:
        result = client.schema.list_schemas()
        print(result)
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
