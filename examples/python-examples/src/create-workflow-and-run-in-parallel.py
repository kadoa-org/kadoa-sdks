#!/usr/bin/env python3
"""
Create workflow and run in parallel example for Kadoa SDK.
"""

import concurrent.futures
import sys

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.extraction.types import ExtractOptions, RunWorkflowOptions
from kadoa_sdk.notifications import NotificationOptions


def main():
    settings = get_settings()

    client = KadoaClient(
        KadoaClientConfig(
            api_key=settings.api_key,
            base_url=settings.public_api_uri,
            enable_realtime=True,
        )
    )

    try:
        realtime = client.connect_realtime()
        if realtime:
            realtime.on_event(lambda event: print("event: ", event))

        created_extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="My Workflow",
                )
            )
            .with_notifications(
                NotificationOptions(
                    events="all",
                    channels={"WEBSOCKET": True},
                )
            )
            .bypass_preview()
            .set_location({"type": "auto"})
            .set_interval({"interval": "ONLY_ONCE"})
            .create()
        )

        # Run multiple extractions in parallel
        def run_extraction(i):
            print(f"Running extraction {i}...")
            result = created_extraction.run(
                RunWorkflowOptions(
                    limit=5,
                    variables={"runSeq": i},
                )
            )
            return result.fetch_data({"limit": 5})

        with concurrent.futures.ThreadPoolExecutor() as executor:
            results = list(executor.map(run_extraction, [1, 2, 3]))

        print(results)
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
