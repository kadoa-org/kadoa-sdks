"""
Shared Fixtures for Read-Only Tests

Use these utilities for tests that only read data.
Fixtures are seeded once and reused across test runs.

Example:
    ```python
    from tests.utils.shared_fixtures import get_shared_validation_fixture

    @pytest.fixture(scope="module")
    def validation_fixture(client):
        return get_shared_validation_fixture(client)

    def test_lists_validations(client, validation_fixture):
        result = client.validation.list_workflow_validations(
            ListWorkflowValidationsRequest(workflow_id=validation_fixture["workflow_id"])
        )
        assert len(result.data) > 0
    ```
"""

from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from kadoa_sdk import KadoaClient

from tests.utils.seeder import seed_rule, seed_validation, seed_workflow


# ============================================================================
# Types
# ============================================================================


@dataclass
class SharedValidationFixture:
    """Fixture containing workflow, rule, and validation for read-only tests."""

    workflow_id: str
    job_id: str
    rule_id: str
    rule_name: str
    validation_id: str


@dataclass
class SharedWorkflowFixture:
    """Fixture containing workflow for read-only tests."""

    workflow_id: str
    job_id: Optional[str] = None


# ============================================================================
# Fixture Names (deterministic, idempotent)
# ============================================================================

FIXTURE_NAMES = {
    "VALIDATION_WORKFLOW": "shared-fixture-validation",
    "VALIDATION_RULE": "shared-fixture-validation-rule",
    "WORKFLOW_READ_ONLY": "shared-fixture-workflow-readonly",
}


# ============================================================================
# Singleton Cache
# ============================================================================

_validation_fixture_cache: Optional[SharedValidationFixture] = None
_workflow_fixture_cache: Optional[SharedWorkflowFixture] = None


# ============================================================================
# Public API
# ============================================================================


def get_shared_validation_fixture(client: "KadoaClient") -> SharedValidationFixture:
    """
    Get shared validation fixture for read-only tests.

    Seeds workflow, rule, and validation once. Subsequent calls return cached fixture.
    Safe for parallel test execution - all tests read from same fixture.

    Args:
        client: KadoaClient instance

    Returns:
        SharedValidationFixture with workflow_id, job_id, rule_id, rule_name, validation_id
    """
    global _validation_fixture_cache

    if _validation_fixture_cache:
        print("[SharedFixture] Using cached validation fixture")
        return _validation_fixture_cache

    print("[SharedFixture] Seeding validation fixture...")

    result = seed_workflow(
        FIXTURE_NAMES["VALIDATION_WORKFLOW"],
        client,
        run_job=True,
    )

    workflow_id = result["workflow_id"]
    job_id = result.get("job_id")

    if not job_id:
        raise Exception("[SharedFixture] Failed to seed workflow with job")

    rule_id = seed_rule(
        FIXTURE_NAMES["VALIDATION_RULE"],
        workflow_id,
        client,
    )

    validation_id = seed_validation(workflow_id, job_id, client)

    _validation_fixture_cache = SharedValidationFixture(
        workflow_id=workflow_id,
        job_id=job_id,
        rule_id=rule_id,
        rule_name=FIXTURE_NAMES["VALIDATION_RULE"],
        validation_id=validation_id,
    )

    print(f"[SharedFixture] Validation fixture ready: {_validation_fixture_cache}")
    return _validation_fixture_cache


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


# ============================================================================
# Cache Management
# ============================================================================


def clear_fixture_cache() -> None:
    """
    Clear fixture caches.

    Call in conftest.py teardown if running tests in watch mode.
    Not needed for CI runs.
    """
    global _validation_fixture_cache, _workflow_fixture_cache

    _validation_fixture_cache = None
    _workflow_fixture_cache = None
    print("[SharedFixture] Cache cleared")


def is_fixture_cached() -> dict:
    """Check if fixtures are cached."""
    return {
        "validation": _validation_fixture_cache is not None,
        "workflow": _workflow_fixture_cache is not None,
    }
