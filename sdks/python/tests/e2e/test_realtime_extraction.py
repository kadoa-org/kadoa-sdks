"""
E2E tests for realtime extraction functionality matching Node.js structure.
"""

import os
import time

import pytest
import pytest_asyncio

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.exceptions import KadoaHttpError
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.extraction.types import ExtractOptions, WaitForReadyOptions
from kadoa_sdk.schemas.schema_builder import FieldOptions


def has_real_time_interval_error(payload) -> bool:
    """Check if payload contains REAL_TIME interval error."""
    if not payload or not isinstance(payload, dict):
        return False
    validation_errors = payload.get("validationErrors") or payload.get("validation_errors")
    if not validation_errors:
        return False
    interval_error = validation_errors.get("interval")
    return isinstance(interval_error, str) and "REAL_TIME" in interval_error


def to_workflow_id(event) -> str | None:
    """Extract workflow ID from event."""
    if not event or not isinstance(event, dict):
        return None

    workflow_id = event.get("workflowId") or event.get("workflow_id")
    if isinstance(workflow_id, str):
        return workflow_id

    # Check nested data or payload
    for key in ["data", "payload"]:
        nested = event.get(key)
        if isinstance(nested, dict):
            nested_workflow_id = nested.get("workflowId") or nested.get("workflow_id")
            if isinstance(nested_workflow_id, str):
                return nested_workflow_id

    return None


@pytest.mark.e2e
class TestRealtimeExtraction:
    """E2E tests for realtime extraction functionality."""

    @pytest_asyncio.fixture(scope="class")
    async def client(self):
        """Initialize client for all tests in this class."""
        settings = get_settings()
        base_url = (
            settings.public_api_uri
            if os.getenv("KADOA_PUBLIC_API_URI")
            else "http://localhost:12380"
        )
        client = KadoaClient(
            KadoaClientConfig(
                api_key=settings.api_key,
                base_url=base_url,
                timeout=30,
                enable_realtime=True,
            )
        )

        yield client

        client.dispose()

    @pytest.mark.integration
    @pytest.mark.timeout(360)
    def test_creates_a_realtime_workflow_and_waits_for_preview(self, client):
        """Creates a realtime workflow and waits for preview."""
        wait_options = WaitForReadyOptions(
            poll_interval_ms=5000,
            timeout_ms=5 * 60 * 1000,
        )

        urls = [
            "https://sandbox.kadoa.com/financial",
            "https://sandbox.kadoa.com/change-detection",
        ]

        created = None
        schema_type = None

        for url in urls:

            def make_extraction_builder(url):
                def extraction_builder(builder):
                    if "financial" in url:
                        return (
                            builder.entity("FinancialReport")
                            .field(
                                "title",
                                "The title of the financial report.",
                                "STRING",
                                FieldOptions(example="Q2 Report", is_key=True),
                            )
                            .field(
                                "postedDate",
                                "The date the financial report was posted.",
                                "DATE",
                                FieldOptions(example="2024-05-15", is_key=True),
                            )
                            .field(
                                "link",
                                "The link to view the financial report.",
                                "LINK",
                                FieldOptions(example="https://dummy.com/q2"),
                            )
                        )
                    else:
                        return (
                            builder.entity("MarketChange")
                            .field(
                                "title",
                                "Title of the item",
                                "STRING",
                                FieldOptions(example="Market Analysis Report", is_key=True),
                            )
                            .field(
                                "date",
                                "Date associated with the item",
                                "STRING",
                                FieldOptions(example="Date: 2024-01-15"),
                            )
                            .field(
                                "link",
                                "URL linking to the item details",
                                "LINK",
                                FieldOptions(
                                    example="https://example.com/market-analysis-jan-2024"
                                ),
                            )
                            .field(
                                "text",
                                "Brief description or content of the item",
                                "STRING",
                                FieldOptions(
                                    example="Comprehensive analysis of global commodity markets"
                                ),
                            )
                        )

                return extraction_builder

            extraction = client.extract(
                ExtractOptions(
                    urls=[url],
                    name=f"Realtime SDK Test {int(time.time() * 1000)}",
                    extraction=make_extraction_builder(url),
                )
            ).set_interval({"interval": "REAL_TIME"})

            try:
                created = extraction.create()
                schema_type = "financial" if "financial" in url else "changeDetection"
                break
            except KadoaHttpError as error:
                if error.http_status == 400 and has_real_time_interval_error(error.response_body):
                    print(
                        "Skipping realtime extraction e2e test: "
                        "interval REAL_TIME is not enabled for this team."
                    )
                    pytest.skip("REAL_TIME interval not enabled for this team")
                    return
                if error.code in ("NETWORK_ERROR", "HTTP_ERROR"):
                    print(
                        "Skipping realtime extraction e2e test: "
                        "network access to the public API is required."
                    )
                    pytest.skip("Network access required")
                    return

                # Try next URL if available
                if url == urls[0]:
                    continue

                raise

        if not created:
            pytest.fail("Failed to create realtime workflow for both scenarios")

        print(f"Realtime schema used: {schema_type}")

        assert created.workflow_id is not None

        # Set up event listener
        events_received = []

        def on_event(event):
            workflow_id = created.workflow_id
            candidate = to_workflow_id(event)

            if candidate == workflow_id:
                print(f"Realtime event received for workflow {workflow_id}")
                events_received.append(event)

        if client._realtime:
            client._realtime.on_event(on_event)

        workflow = created.wait_for_ready(wait_options)

        # Check workflow state
        workflow_state = getattr(workflow, "state", None) or (
            workflow.model_dump() if hasattr(workflow, "model_dump") else {}
        ).get("state")
        assert workflow_state in ["PREVIEW", "ACTIVE"]
