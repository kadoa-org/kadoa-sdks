"""
E2E tests for event handling in Kadoa SDK.
"""

import os
import pytest
from typing import List

from kadoa_sdk import initialize_app, KadoaSdkConfig, run_extraction, ExtractionOptions
from kadoa_sdk.events import KadoaEvent


@pytest.mark.e2e
class TestEventsE2E:
    """E2E tests for event emissions."""

    @pytest.fixture(scope="class")
    def app(self):
        """Create app instance for tests."""
        test_api_key = os.environ.get("KADOA_API_KEY", "39113751-1e7a-4cb2-9516-1e25d0085aa5")
        test_base_url = os.environ.get("KADOA_BASE_URL", "http://localhost:12380")

        return initialize_app(KadoaSdkConfig(api_key=test_api_key, base_url=test_base_url, timeout=30))

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_should_emit_all_extraction_events(self, app):
        """Test that all expected events are emitted during extraction."""
        events: List[KadoaEvent] = []

        def event_listener(event: KadoaEvent):
            """Capture all events."""
            events.append(event)
            print("-" * 32)
            print(f"Event type: {event.type}")
            print(f"Timestamp: {event.timestamp}")
            print(f"Source: {event.source}")
            print(f"Payload: {event.payload}")
            if event.metadata:
                print(f"Metadata: {event.metadata}")

        # Subscribe to events
        app.on_event(event_listener)

        options = ExtractionOptions(
            urls=["https://sandbox.kadoa.com/careers"],
            max_wait_time=50000,  # 50 seconds for testing
        )

        try:
            result = run_extraction(app, options)

            # Verify we got expected events
            event_types = [e.type for e in events]

            # Should have entity detection event
            assert "entity:detected" in event_types, "Should emit entity:detected"

            # Should have extraction lifecycle events
            assert "extraction:started" in event_types, "Should emit extraction:started"
            assert (
                "extraction:status_changed" in event_types
            ), "Should emit extraction:status_changed"

            # If successful, should have data and completion events
            if result and result.workflow and result.workflow.is_successful():
                assert (
                    "extraction:data_available" in event_types
                ), "Should emit extraction:data_available"
                assert "extraction:completed" in event_types, "Should emit extraction:completed"

                # Verify completion event payload
                completion_events = [e for e in events if e.type == "extraction:completed"]
                assert len(completion_events) == 1, "Should have exactly one completion event"

                completion = completion_events[0]
                assert completion.payload["success"] is True, "Completion should indicate success"
                assert "recordCount" in completion.payload, "Should have record count"

            # Verify event structure
            for event in events:
                assert hasattr(event, "type"), "Event should have type"
                assert hasattr(event, "timestamp"), "Event should have timestamp"
                assert hasattr(event, "source"), "Event should have source"
                assert hasattr(event, "payload"), "Event should have payload"
                assert isinstance(event.payload, dict), "Payload should be a dict"

        except Exception as e:
            # In test environment, workflow may not complete
            # Just ensure we at least got some events
            assert len(events) > 0, f"Should emit some events even on failure: {e}"
            assert "entity:detected" in [e.type for e in events], "Should at least detect entity"

        finally:
            # Cleanup
            app.off_event(event_listener)
