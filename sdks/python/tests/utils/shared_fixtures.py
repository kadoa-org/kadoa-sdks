"""
Shared Fixtures for Read-Only Tests

Use these utilities for tests that only read data.
Fixtures are seeded once and reused across test runs.

Example:
    ```python
    from tests.utils.shared_fixtures import get_shared_workflow_fixture

    @pytest.fixture(scope="module")
    def workflow_fixture(client):
        return get_shared_workflow_fixture(client)

    def test_gets_workflow(client, workflow_fixture):
        workflow = client.workflow.get(workflow_fixture.workflow_id)
        assert workflow.id == workflow_fixture.workflow_id
    ```
"""

import time
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from kadoa_sdk import KadoaClient

from tests.utils.seeder import seed_workflow


# ============================================================================
# Types
# ============================================================================


@dataclass
class SharedWorkflowFixture:
    """Fixture containing workflow for read-only tests."""

    workflow_id: str
    job_id: Optional[str] = None


# ============================================================================
# Fixture Names (deterministic, idempotent)
# ============================================================================

FIXTURE_NAMES = {
    "WORKFLOW_READ_ONLY": "shared-fixture-workflow-readonly",
    "DOCS_WORKFLOW": "Fixture Workflow - Docs Snippets",
}


# ============================================================================
# Singleton Cache
# ============================================================================

_workflow_fixture_cache: Optional[SharedWorkflowFixture] = None
_docs_workflow_id_cache: Optional[str] = None


# ============================================================================
# Public API
# ============================================================================


def get_shared_workflow_fixture(
    client: "KadoaClient",
    run_job: bool = False,
) -> SharedWorkflowFixture:
    """
    Get shared workflow fixture for read-only workflow tests.

    Seeds workflow once. Subsequent calls return cached fixture.
    Use for tests that only read workflow data (get, list, get_by_name).

    Args:
        client: KadoaClient instance
        run_job: Whether to run a job for the workflow

    Returns:
        SharedWorkflowFixture with workflow_id and optionally job_id
    """
    global _workflow_fixture_cache

    if _workflow_fixture_cache:
        print("[SharedFixture] Using cached workflow fixture")
        return _workflow_fixture_cache

    print("[SharedFixture] Seeding workflow fixture...")

    result = seed_workflow(
        FIXTURE_NAMES["WORKFLOW_READ_ONLY"],
        client,
        run_job=run_job,
    )

    _workflow_fixture_cache = SharedWorkflowFixture(
        workflow_id=result["workflow_id"],
        job_id=result.get("job_id"),
    )

    print(f"[SharedFixture] Workflow fixture ready: {_workflow_fixture_cache}")
    return _workflow_fixture_cache


def get_docs_workflow_fixture(client: "KadoaClient") -> str:
    """
    Get docs workflow fixture for docs snippet tests.

    Creates a simple workflow using the builder API. Subsequent calls return cached ID.

    Args:
        client: KadoaClient instance

    Returns:
        workflow_id string
    """
    global _docs_workflow_id_cache

    if _docs_workflow_id_cache:
        print("[SharedFixture] Using cached docs workflow fixture")
        return _docs_workflow_id_cache

    print("[SharedFixture] Creating docs workflow fixture...")

    from kadoa_sdk.extraction.types import ExtractOptions
    from kadoa_sdk.schemas.schema_builder import FieldOptions

    workflow = (
        client.extract(
            ExtractOptions(
                urls=["https://sandbox.kadoa.com/ecommerce"],
                name=f'{FIXTURE_NAMES["DOCS_WORKFLOW"]}-{time.time_ns()}',
                extraction=lambda builder: builder.entity("Product")
                .field("title", "Product name", "STRING", FieldOptions(example="Test Product"))
                .field("price", "Product price", "MONEY"),
            )
        )
        .create()
    )

    _docs_workflow_id_cache = workflow.workflow_id
    print(f"[SharedFixture] Docs workflow fixture ready: {_docs_workflow_id_cache}")
    return _docs_workflow_id_cache


# ============================================================================
# Cache Management
# ============================================================================


def clear_fixture_cache() -> None:
    """
    Clear fixture caches.

    Call in conftest.py teardown if running tests in watch mode.
    Not needed for CI runs.
    """
    global _workflow_fixture_cache, _docs_workflow_id_cache

    _workflow_fixture_cache = None
    _docs_workflow_id_cache = None
    print("[SharedFixture] Cache cleared")


def is_fixture_cached() -> dict:
    """Check if fixtures are cached."""
    return {
        "workflow": _workflow_fixture_cache is not None,
    }
