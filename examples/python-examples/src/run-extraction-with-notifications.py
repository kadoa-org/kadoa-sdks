#!/usr/bin/env python3
"""
Run extraction with notifications example for Kadoa SDK.
"""

import sys

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.extraction.types import ExtractOptions
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
        print("Running extraction with notifications...")
        # Set up event listener
        realtime = client.connect_realtime()
        if realtime:
            realtime.on_event(lambda event: print("event: ", event))

        available_events = client.notification.settings.list_all_events()
        print("availableEvents: ", available_events)

        # Use extraction builder API for notifications
        created_extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Extraction with Notifications",
                )
            )
            .with_notifications(
                NotificationOptions(
                    events="all",  # or subset of availableEvents
                    channels={"WEBSOCKET": True},
                )
            )
            .bypass_preview()
            .set_interval({"interval": "ONLY_ONCE"})
            .create()
        )

        result = created_extraction.run()

        print(f"Extraction completed: {result.workflow_id}")
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
