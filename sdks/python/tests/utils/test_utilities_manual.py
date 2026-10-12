#!/usr/bin/env python3
"""Manual test script for test utilities.

Run with:
    cd sdks/python
    direnv exec . uv run python tests/utils/test_utilities_manual.py
"""

import sys
import traceback
from pathlib import Path
from typing import Any

# Add parent directories to path for imports
_tests_dir = Path(__file__).parent.parent
_sdk_dir = _tests_dir.parent
sys.path.insert(0, str(_sdk_dir))

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.extraction.types import ExtractOptions
from kadoa_sdk.schemas.schema_builder import FieldOptions
from kadoa_sdk.schemas.schemas_acl import CreateSchemaRequest, DataField, FieldExample, SchemaField

from tests.utils.cleanup_helpers import (
    delete_channel_by_name,
    delete_schema_by_name,
    delete_workflow_by_name,
)
from tests.utils.seeder import seed_workflow
from tests.utils.shared_fixtures import (
    clear_fixture_cache,
    get_docs_workflow_fixture,
    get_shared_workflow_fixture,
)

# Test resource names
TEST_WORKFLOW_NAME = "test-util-workflow-manual"
TEST_SCHEMA_NAME = "test-util-schema-manual"
TEST_CHANNEL_NAME = "test-util-channel-manual"


class ManualTestResult:
    def __init__(self, name: str):
        self.name = name
        self.passed = False
        self.error: str | None = None
        self.details: dict[str, Any] = {}


def print_header(text: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}")


def print_test(name: str) -> None:
    print(f"\n>>> Testing: {name}")


def print_pass(details: str = "") -> None:
    msg = "    PASS"
    if details:
        msg += f" - {details}"
    print(msg)


def print_fail(error: str) -> None:
    print(f"    FAIL - {error}")


def create_test_client() -> KadoaClient:
    settings = get_settings()
    return KadoaClient(KadoaClientConfig(api_key=settings.api_key, timeout=60))


# =============================================================================
# Cleanup Helper Tests
# =============================================================================


def check_delete_workflow_by_name_exists(client: KadoaClient) -> ManualTestResult:
    """Test deleting a workflow that exists."""
    result = ManualTestResult("delete_workflow_by_name (exists)")
    name = f"{TEST_WORKFLOW_NAME}-delete-exists"

    try:
        # Setup: create workflow
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name=name,
                    extraction=lambda b: b.entity("Test").field(
                        "title", "Title", "STRING", FieldOptions(example="Test")
                    ),
                )
            )
            .bypass_preview()
            .create()
        )
        workflow_id = workflow.workflow_id
        print(f"    Created workflow: {workflow_id}")

        # Test: delete by name
        delete_workflow_by_name(client, name)

        # Verify: workflow should not exist
        found = client.workflow.get_by_name(name)
        if found is None:
            result.passed = True
            result.details["workflow_id"] = workflow_id
        else:
            result.error = f"Workflow still exists after deletion: {found}"

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()

    return result


def check_delete_workflow_by_name_not_exists(client: KadoaClient) -> ManualTestResult:
    """Test deleting a workflow that doesn't exist."""
    result = ManualTestResult("delete_workflow_by_name (not exists)")
    name = f"{TEST_WORKFLOW_NAME}-not-exists-xyz123"

    try:
        # Test: delete non-existent workflow (should not raise)
        delete_workflow_by_name(client, name)
        result.passed = True

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()

    return result


def check_delete_schema_by_name_exists(client: KadoaClient) -> ManualTestResult:
    """Test deleting a schema that exists."""
    result = ManualTestResult("delete_schema_by_name (exists)")
    name = f"{TEST_SCHEMA_NAME}-delete-exists"

    try:
        # Setup: create schema
        fields = [
            SchemaField(
                actual_instance=DataField(
                    name="title",
                    description="Test field",
                    fieldType="SCHEMA",
                    dataType="STRING",
                    example=FieldExample(actual_instance="Test"),
                )
            )
        ]
        schema = client.schema.create_schema(
            CreateSchemaRequest(name=name, entity="TestEntity", fields=fields)
        )
        schema_id = schema.id
        print(f"    Created schema: {schema_id}")

        # Test: delete by name
        delete_schema_by_name(client, name)

        # Verify: schema should not exist
        schemas = client.schema.list_schemas()
        found = next((s for s in schemas if getattr(s, "name", None) == name), None)
        if found is None:
            result.passed = True
            result.details["schema_id"] = schema_id
        else:
            result.error = f"Schema still exists after deletion"

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()

    return result


def check_delete_schema_by_name_not_exists(client: KadoaClient) -> ManualTestResult:
    """Test deleting a schema that doesn't exist."""
    result = ManualTestResult("delete_schema_by_name (not exists)")
    name = f"{TEST_SCHEMA_NAME}-not-exists-xyz123"

    try:
        # Test: delete non-existent schema (should not raise)
        delete_schema_by_name(client, name)
        result.passed = True

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()

    return result


def check_delete_channel_by_name_not_exists(client: KadoaClient) -> ManualTestResult:
    """Test deleting a channel that doesn't exist."""
    result = ManualTestResult("delete_channel_by_name (not exists)")
    name = f"{TEST_CHANNEL_NAME}-not-exists-xyz123"

    try:
        # Test: delete non-existent channel (should not raise)
        delete_channel_by_name(client, name)
        result.passed = True

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()

    return result


# =============================================================================
# Seeder Tests
# =============================================================================


def check_seed_workflow_new(client: KadoaClient) -> ManualTestResult:
    """Test seeding a new workflow."""
    result = ManualTestResult("seed_workflow (new)")
    name = f"{TEST_WORKFLOW_NAME}-seed-new"

    try:
        # Cleanup first
        delete_workflow_by_name(client, name)

        # Test: seed new workflow
        seeded = seed_workflow(name, client)
        workflow_id = seeded.get("workflow_id")

        if workflow_id:
            result.passed = True
            result.details["workflow_id"] = workflow_id
            # Cleanup
            client.workflow.delete(workflow_id)
        else:
            result.error = "No workflow_id returned"

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()

    return result


def check_seed_workflow_existing(client: KadoaClient) -> ManualTestResult:
    """Test seeding an existing workflow (should reuse)."""
    result = ManualTestResult("seed_workflow (existing)")
    name = f"{TEST_WORKFLOW_NAME}-seed-existing"

    try:
        # Cleanup first
        delete_workflow_by_name(client, name)

        # Setup: seed first time
        first = seed_workflow(name, client)
        first_id = first.get("workflow_id")
        print(f"    First seed: {first_id}")

        # Test: seed second time (should reuse)
        second = seed_workflow(name, client)
        second_id = second.get("workflow_id")
        print(f"    Second seed: {second_id}")

        if first_id == second_id:
            result.passed = True
            result.details["workflow_id"] = first_id
        else:
            result.error = f"IDs don't match: {first_id} != {second_id}"

        # Cleanup
        if first_id:
            client.workflow.delete(first_id)

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()

    return result


def check_seed_workflow_with_job(client: KadoaClient) -> ManualTestResult:
    """Test seeding a workflow with run_job=True."""
    result = ManualTestResult("seed_workflow (with job)")
    name = f"{TEST_WORKFLOW_NAME}-seed-job"

    try:
        # Cleanup first
        delete_workflow_by_name(client, name)

        # Test: seed with job
        seeded = seed_workflow(name, client, run_job=True)
        workflow_id = seeded.get("workflow_id")
        job_id = seeded.get("job_id")

        print(f"    workflow_id: {workflow_id}")
        print(f"    job_id: {job_id}")

        if workflow_id and job_id:
            result.passed = True
            result.details["workflow_id"] = workflow_id
            result.details["job_id"] = job_id
        else:
            result.error = f"Missing IDs: workflow={workflow_id}, job={job_id}"

        # Cleanup
        if workflow_id:
            client.workflow.delete(workflow_id)

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()

    return result


# =============================================================================
# Shared Fixture Tests
# =============================================================================


def check_shared_workflow_fixture(client: KadoaClient) -> ManualTestResult:
    """Test get_shared_workflow_fixture."""
    result = ManualTestResult("get_shared_workflow_fixture")

    try:
        # Clear cache first
        clear_fixture_cache()

        # Test: get fixture
        fixture = get_shared_workflow_fixture(client)
        print(f"    workflow_id: {fixture.workflow_id}")

        # Test: caching (second call should use cache)
        fixture2 = get_shared_workflow_fixture(client)
        print(f"    Second call (should be cached): {fixture2.workflow_id}")

        if fixture.workflow_id == fixture2.workflow_id:
            result.passed = True
            result.details["workflow_id"] = fixture.workflow_id
        else:
            result.error = "Caching not working"

        # Note: Don't delete shared fixtures - they're meant to be reused

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()

    return result


def check_docs_workflow_fixture(client: KadoaClient) -> ManualTestResult:
    """Test get_docs_workflow_fixture."""
    result = ManualTestResult("get_docs_workflow_fixture")

    try:
        # Clear cache first
        clear_fixture_cache()

        # Test: get fixture
        workflow_id = get_docs_workflow_fixture(client)
        print(f"    workflow_id: {workflow_id}")

        # Test: caching
        workflow_id2 = get_docs_workflow_fixture(client)
        print(f"    Second call (should be cached): {workflow_id2}")

        if workflow_id == workflow_id2:
            result.passed = True
            result.details["workflow_id"] = workflow_id
        else:
            result.error = "Caching not working"

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()

    return result


# =============================================================================
# Main
# =============================================================================


def run_tests(test_funcs: list, client: KadoaClient) -> list[ManualTestResult]:
    """Run a list of test functions."""
    results = []
    for test_func in test_funcs:
        print_test(test_func.__name__)
        result = test_func(client)
        results.append(result)
        if result.passed:
            print_pass(str(result.details) if result.details else "")
        else:
            print_fail(result.error or "Unknown error")
    return results


def main() -> int:
    print_header("Test Utilities Manual Test")
    client = create_test_client()

    all_results: list[ManualTestResult] = []

    # Cleanup Helper Tests
    print_header("1. Cleanup Helper Tests")
    cleanup_tests = [
        check_delete_workflow_by_name_exists,
        check_delete_workflow_by_name_not_exists,
        check_delete_schema_by_name_exists,
        check_delete_schema_by_name_not_exists,
        check_delete_channel_by_name_not_exists,
    ]
    all_results.extend(run_tests(cleanup_tests, client))

    # Seeder Tests
    print_header("2. Seeder Tests")
    seeder_tests = [
        check_seed_workflow_new,
        check_seed_workflow_existing,
        check_seed_workflow_with_job,
    ]
    all_results.extend(run_tests(seeder_tests, client))

    # Shared Fixture Tests
    print_header("3. Shared Fixture Tests")
    fixture_tests = [
        check_shared_workflow_fixture,
        check_docs_workflow_fixture,
    ]
    all_results.extend(run_tests(fixture_tests, client))

    # Summary
    print_header("Summary")
    passed = sum(1 for r in all_results if r.passed)
    failed = sum(1 for r in all_results if not r.passed)
    print(f"  Passed: {passed}")
    print(f"  Failed: {failed}")
    print(f"  Total:  {len(all_results)}")

    if failed > 0:
        print("\nFailed tests:")
        for r in all_results:
            if not r.passed:
                print(f"  - {r.name}: {r.error}")

    client.dispose()
    return 1 if failed > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
