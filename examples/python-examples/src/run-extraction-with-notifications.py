#!/usr/bin/env python3
"""
Run extraction with notifications example for Kadoa SDK.
"""

import sys
import time

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.extraction.types import ExtractOptions
from kadoa_sdk.notifications import NotificationOptions


def main():
    settings = get_settings()

    client = KadoaClient(
        KadoaClientConfig(
            api_key=settings.api_key,
            enable_realtime=True,
        )
    )

    try:
        print("Running extraction with notifications...")
        print(f"WebSocket events URL: {settings.wss_api_uri}")
        # Set up event listener
        realtime = client.connect_realtime()
        if realtime:
            realtime.on_event(lambda event: print("event: ", event))
            
            # Wait for WebSocket connection to be established
            print("Waiting for WebSocket connection...")
            max_wait = 10  # seconds
            waited = 0
            while not client.is_realtime_connected() and waited < max_wait:
                time.sleep(0.5)
                waited += 0.5
            if client.is_realtime_connected():
                print("WebSocket connected")
            else:
                print("Warning: WebSocket connection timeout, events may not be received")

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
        
        # Wait a bit for events to arrive before disposing
        print("Waiting for events (10 seconds)...")
        time.sleep(10)
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
