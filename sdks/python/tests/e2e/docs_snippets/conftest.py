"""Shared fixtures for docs snippets tests."""

import pytest

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.extraction.types import ExtractOptions
from kadoa_sdk.schemas.schema_builder import FieldOptions


# Track fixture workflow for cleanup (not used for per-test tracking)
_fixture_workflow_id: str | None = None


@pytest.fixture(scope="session")
def api_key() -> str:
    settings = get_settings()
    return settings.api_key


@pytest.fixture(scope="session")
def client(api_key: str) -> KadoaClient:
    """Create client for all tests."""
    client = KadoaClient(KadoaClientConfig(api_key=api_key, timeout=30))

    # Best-effort cleanup of notification channels from previous runs
    try:
        existing_channels = client.notification.channels.list_channels()
        for channel in existing_channels:
            channel_id = getattr(channel, "id", None)
            if channel_id:
                try:
                    client.notification.channels.delete_channel(channel_id)
                except Exception:
                    pass
    except Exception:
        pass

    yield client

    # Cleanup fixture workflow
    if _fixture_workflow_id:
        try:
            client.workflow.delete(_fixture_workflow_id)
        except Exception:
            pass

    client.dispose()


# ============================================================================
# Cleanup helpers - delete by name (for test isolation)
# ============================================================================


def delete_schema_by_name(client, name: str) -> None:
    """Delete schema by name if exists. Call at start of test for clean env."""
    try:
        schemas = client.schema.list_schemas()
        existing = next((s for s in schemas if s.name == name), None)
        if existing and existing.id:
            client.schema.delete_schema(existing.id)
    except Exception:
        pass


def delete_channel_by_name(client, name: str) -> None:
    """Delete channel by name if exists. Call at start of test for clean env."""
    try:
        channels = client.notification.channels.list_channels()
        existing = next((c for c in channels if c.name == name), None)
        if existing and getattr(existing, "id", None):
            client.notification.channels.delete_channel(existing.id)
    except Exception:
        pass


def delete_workflow_by_name(client, name: str) -> None:
    """Delete workflow by name if exists. Call at start of test for clean env."""
    try:
        existing = client.workflow.get_by_name(name)
        if existing:
            workflow_id = getattr(existing, "_id", None) or getattr(existing, "id", None)
            if workflow_id:
                client.workflow.delete(workflow_id)
    except Exception:
        pass


@pytest.fixture(scope="session")
def fixture_workflow_id(client) -> str:
    """Create a fixture workflow for tests that need an existing workflow."""
    global _fixture_workflow_id

    workflow = (
        client.extract(
            ExtractOptions(
                urls=["https://sandbox.kadoa.com/ecommerce"],
                name="Fixture Workflow - Docs Snippets",
                extraction=lambda builder: builder.entity("Product")
                .field("title", "Product name", "STRING", FieldOptions(example="Test Product"))
                .field("price", "Product price", "MONEY"),
            )
        )
        .create()
    )
    _fixture_workflow_id = workflow.workflow_id
    return _fixture_workflow_id


@pytest.fixture(scope="session")
def fixture_validation(client):
    """Get shared validation fixture with workflow_id, job_id, and validation_id."""
    from tests.utils.shared_fixtures import get_shared_validation_fixture

    return get_shared_validation_fixture(client)
