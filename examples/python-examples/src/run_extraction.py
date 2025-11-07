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
            base_url=settings.public_api_uri,
        )
    )

    try:
        print("Running extraction...")
        result = client.extraction.run(
            ExtractionOptions(
                urls=["https://sandbox.kadoa.com/ecommerce"],
            )
        )

        if result.workflow_id:
            print("Fetching data...")
            page1 = client.extraction.data_fetcher.fetch_data(
                FetchDataOptions(
                    workflow_id=result.workflow_id,
                    page=1,
                )
            )
            print("Page 1:")
            print("--------------------------------")
            print(page1.data[:5] if page1.data else [])
            print(page1.pagination)
            print("--------------------------------")

        print(result.data[:5] if result.data else [])
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
