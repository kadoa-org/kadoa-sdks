"""Cleanup utilities for E2E tests."""

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from kadoa_sdk import KadoaClient

# Track workflows created in tests for cleanup
_test_workflow_ids: list[str] = []


def track_workflow(workflow_id: str) -> None:
    """Track a workflow ID for cleanup after tests complete."""
    if workflow_id and workflow_id not in _test_workflow_ids:
        _test_workflow_ids.append(workflow_id)


def get_tracked_workflows() -> list[str]:
    """Get list of tracked workflow IDs."""
    return _test_workflow_ids.copy()


def clear_tracked_workflows() -> None:
    """Clear tracked workflows list."""
    _test_workflow_ids.clear()


def delete_workflow_by_name(client: "KadoaClient", name: str) -> None:
    """Delete a workflow by name if it exists."""
    workflow = client.workflow.get_by_name(name)
    if workflow:
        workflow_id = (
            getattr(workflow, "id", None)
            or getattr(workflow, "_id", None)
            or (workflow.get("id") if isinstance(workflow, dict) else None)
            or (workflow.get("_id") if isinstance(workflow, dict) else None)
        )
        if workflow_id:
            client.workflow.delete(workflow_id)


def delete_schema_by_name(client: "KadoaClient", name: str) -> None:
    """Delete a schema by name if it exists."""
    schemas = client.schema.list_schemas()
    existing = next(
        (
            s
            for s in schemas
            if (getattr(s, "name", None) or (s.get("name") if isinstance(s, dict) else None))
            == name
        ),
        None,
    )
    if existing:
        schema_id = (
            getattr(existing, "id", None)
            or getattr(existing, "_id", None)
            or (existing.get("id") if isinstance(existing, dict) else None)
            or (existing.get("_id") if isinstance(existing, dict) else None)
        )
        if schema_id:
            client.schema.delete_schema(schema_id)


def delete_channel_by_name(client: "KadoaClient", name: str) -> None:
    """Delete a notification channel by name if it exists."""
    channels = client.notification.channels.list_channels({})
    existing = next(
        (
            c
            for c in channels
            if (getattr(c, "name", None) or (c.get("name") if isinstance(c, dict) else None))
            == name
        ),
        None,
    )
    if existing:
        channel_id = (
            getattr(existing, "id", None)
            or getattr(existing, "_id", None)
            or (existing.get("id") if isinstance(existing, dict) else None)
            or (existing.get("_id") if isinstance(existing, dict) else None)
        )
        if channel_id:
            client.notification.channels.delete_channel(channel_id)
