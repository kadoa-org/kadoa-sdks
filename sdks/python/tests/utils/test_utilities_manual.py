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
from kadoa_sdk.validation import BulkDeleteRulesRequest

from tests.utils.cleanup_helpers import (
    delete_channel_by_name,
    delete_schema_by_name,
    delete_workflow_by_name,
)
from tests.utils.seeder import seed_rule, seed_validation, seed_workflow
from tests.utils.shared_fixtures import (
    clear_fixture_cache,
    get_docs_workflow_fixture,
    get_shared_validation_fixture,
    get_shared_workflow_fixture,
)

# Test resource names
TEST_WORKFLOW_NAME = "test-util-workflow-manual"
TEST_SCHEMA_NAME = "test-util-schema-manual"
TEST_CHANNEL_NAME = "test-util-channel-manual"
TEST_RULE_NAME = "test-util-rule-manual"


class TestResult:
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


def delete_rule(client: KadoaClient, workflow_id: str, rule_id: str) -> None:
    """Delete a single rule using bulk_delete_rules."""
    try:
        client.validation.rules.bulk_delete_rules(
            BulkDeleteRulesRequest(workflow_id=workflow_id, rule_ids=[rule_id])
        )
    except Exception as e:
        print(f"    Warning: Failed to delete rule {rule_id}: {e}")


# =============================================================================
# Cleanup Helper Tests
# =============================================================================


def test_delete_workflow_by_name_exists(client: KadoaClient) -> TestResult:
    """Test deleting a workflow that exists."""
    result = TestResult("delete_workflow_by_name (exists)")
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


def test_delete_workflow_by_name_not_exists(client: KadoaClient) -> TestResult:
    """Test deleting a workflow that doesn't exist."""
    result = TestResult("delete_workflow_by_name (not exists)")
    name = f"{TEST_WORKFLOW_NAME}-not-exists-xyz123"

    try:
        # Test: delete non-existent workflow (should not raise)
        delete_workflow_by_name(client, name)
        result.passed = True

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()

    return result


def test_delete_schema_by_name_exists(client: KadoaClient) -> TestResult:
    """Test deleting a schema that exists."""
    result = TestResult("delete_schema_by_name (exists)")
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


def test_delete_schema_by_name_not_exists(client: KadoaClient) -> TestResult:
    """Test deleting a schema that doesn't exist."""
    result = TestResult("delete_schema_by_name (not exists)")
    name = f"{TEST_SCHEMA_NAME}-not-exists-xyz123"

    try:
        # Test: delete non-existent schema (should not raise)
        delete_schema_by_name(client, name)
        result.passed = True

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()

    return result


def test_delete_channel_by_name_not_exists(client: KadoaClient) -> TestResult:
    """Test deleting a channel that doesn't exist."""
    result = TestResult("delete_channel_by_name (not exists)")
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


def test_seed_workflow_new(client: KadoaClient) -> TestResult:
    """Test seeding a new workflow."""
    result = TestResult("seed_workflow (new)")
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


def test_seed_workflow_existing(client: KadoaClient) -> TestResult:
    """Test seeding an existing workflow (should reuse)."""
    result = TestResult("seed_workflow (existing)")
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


def test_seed_workflow_with_job(client: KadoaClient) -> TestResult:
    """Test seeding a workflow with run_job=True."""
    result = TestResult("seed_workflow (with job)")
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


def test_seed_rule_new(client: KadoaClient) -> TestResult:
    """Test seeding a new rule."""
    result = TestResult("seed_rule (new)")
    workflow_name = f"{TEST_WORKFLOW_NAME}-rule-test"
    rule_name = f"{TEST_RULE_NAME}-new"
    workflow_id = None
    rule_id = None

    try:
        # Cleanup and setup
        delete_workflow_by_name(client, workflow_name)
        seeded_wf = seed_workflow(workflow_name, client, run_job=True)
        workflow_id = seeded_wf.get("workflow_id")

        # Delete existing rule if any
        existing_rule = client.validation.rules.get_rule_by_name(rule_name)
        if existing_rule:
            rule_id_to_delete = getattr(existing_rule, "id", None)
            existing_wf_id = getattr(existing_rule, "workflow_id", None)
            if rule_id_to_delete and existing_wf_id:
                delete_rule(client, existing_wf_id, rule_id_to_delete)

        # Test: seed rule
        rule_id = seed_rule(rule_name, workflow_id, client)
        print(f"    rule_id: {rule_id}")

        if rule_id:
            result.passed = True
            result.details["rule_id"] = rule_id
        else:
            result.error = "No rule_id returned"

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()
    finally:
        # Cleanup
        if rule_id and workflow_id:
            delete_rule(client, workflow_id, rule_id)
        if workflow_id:
            client.workflow.delete(workflow_id)

    return result


def test_seed_rule_existing(client: KadoaClient) -> TestResult:
    """Test seeding an existing rule (should reuse)."""
    result = TestResult("seed_rule (existing)")
    workflow_name = f"{TEST_WORKFLOW_NAME}-rule-reuse"
    rule_name = f"{TEST_RULE_NAME}-existing"
    workflow_id = None
    first_id = None

    try:
        # Cleanup and setup
        delete_workflow_by_name(client, workflow_name)
        seeded_wf = seed_workflow(workflow_name, client, run_job=True)
        workflow_id = seeded_wf.get("workflow_id")

        # Delete existing rule if any
        existing_rule = client.validation.rules.get_rule_by_name(rule_name)
        if existing_rule:
            rule_id_to_delete = getattr(existing_rule, "id", None)
            existing_wf_id = getattr(existing_rule, "workflow_id", None)
            if rule_id_to_delete and existing_wf_id:
                delete_rule(client, existing_wf_id, rule_id_to_delete)

        # Seed first time
        first_id = seed_rule(rule_name, workflow_id, client)
        print(f"    First seed: {first_id}")

        # Debug: check what get_rule_by_name returns after creating
        check_rule = client.validation.rules.get_rule_by_name(rule_name)
        print(f"    After first seed, get_rule_by_name returns: {check_rule}")
        if check_rule:
            print(f"    - name: {getattr(check_rule, 'name', 'N/A')}")
            print(f"    - id: {getattr(check_rule, 'id', 'N/A')}")

        # Debug: list all rules to see what's there
        print("    Listing all rules...")
        all_rules = client.validation.rules.list_rules()
        # list_rules returns a list directly
        rules_list = all_rules if isinstance(all_rules, list) else (all_rules.data if hasattr(all_rules, 'data') else [])
        print(f"    Total rules: {len(rules_list)}")
        for r in rules_list[:5]:
            r_name = getattr(r, 'name', None)
            r_id = getattr(r, 'id', None)
            print(f"      - {r_name}: {r_id}")

        # Test: seed second time (should reuse)
        second_id = seed_rule(rule_name, workflow_id, client)
        print(f"    Second seed: {second_id}")

        if first_id == second_id:
            result.passed = True
            result.details["rule_id"] = first_id
        else:
            result.error = f"IDs don't match: {first_id} != {second_id}"

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()
    finally:
        # Cleanup
        if first_id and workflow_id:
            delete_rule(client, workflow_id, first_id)
        if workflow_id:
            client.workflow.delete(workflow_id)

    return result


def test_seed_validation(client: KadoaClient) -> TestResult:
    """Test seeding a validation."""
    result = TestResult("seed_validation")
    workflow_name = f"{TEST_WORKFLOW_NAME}-validation-test"
    rule_name = f"{TEST_RULE_NAME}-validation"
    workflow_id = None
    rule_id = None

    try:
        # Cleanup and setup
        delete_workflow_by_name(client, workflow_name)
        seeded_wf = seed_workflow(workflow_name, client, run_job=True)
        workflow_id = seeded_wf.get("workflow_id")
        job_id = seeded_wf.get("job_id")

        print(f"    workflow_id: {workflow_id}")
        print(f"    job_id: {job_id}")

        # Create rule first
        existing_rule = client.validation.rules.get_rule_by_name(rule_name)
        if existing_rule:
            rule_id = getattr(existing_rule, "id", None)
        else:
            rule_id = seed_rule(rule_name, workflow_id, client)
        print(f"    rule_id: {rule_id}")

        # Test: seed validation
        validation_id = seed_validation(workflow_id, job_id, client)
        print(f"    validation_id: {validation_id}")

        if validation_id:
            result.passed = True
            result.details["validation_id"] = validation_id
        else:
            result.error = "No validation_id returned"

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()
    finally:
        # Cleanup
        if rule_id and workflow_id:
            delete_rule(client, workflow_id, rule_id)
        if workflow_id:
            client.workflow.delete(workflow_id)

    return result


# =============================================================================
# Shared Fixture Tests
# =============================================================================


def test_shared_workflow_fixture(client: KadoaClient) -> TestResult:
    """Test get_shared_workflow_fixture."""
    result = TestResult("get_shared_workflow_fixture")

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


def test_shared_validation_fixture(client: KadoaClient) -> TestResult:
    """Test get_shared_validation_fixture."""
    result = TestResult("get_shared_validation_fixture")

    try:
        # Clear cache first
        clear_fixture_cache()

        # Test: get fixture
        fixture = get_shared_validation_fixture(client)
        print(f"    workflow_id: {fixture.workflow_id}")
        print(f"    job_id: {fixture.job_id}")
        print(f"    rule_id: {fixture.rule_id}")
        print(f"    validation_id: {fixture.validation_id}")

        if fixture.workflow_id and fixture.job_id and fixture.rule_id and fixture.validation_id:
            result.passed = True
            result.details = {
                "workflow_id": fixture.workflow_id,
                "job_id": fixture.job_id,
                "rule_id": fixture.rule_id,
                "validation_id": fixture.validation_id,
            }
        else:
            result.error = "Missing fixture fields"

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}"
        traceback.print_exc()

    return result


def test_docs_workflow_fixture(client: KadoaClient) -> TestResult:
    """Test get_docs_workflow_fixture."""
    result = TestResult("get_docs_workflow_fixture")

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


def run_tests(test_funcs: list, client: KadoaClient) -> list[TestResult]:
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

    all_results: list[TestResult] = []

    # Cleanup Helper Tests
    print_header("1. Cleanup Helper Tests")
    cleanup_tests = [
        test_delete_workflow_by_name_exists,
        test_delete_workflow_by_name_not_exists,
        test_delete_schema_by_name_exists,
        test_delete_schema_by_name_not_exists,
        test_delete_channel_by_name_not_exists,
    ]
    all_results.extend(run_tests(cleanup_tests, client))

    # Seeder Tests
    print_header("2. Seeder Tests")
    seeder_tests = [
        test_seed_workflow_new,
        test_seed_workflow_existing,
        test_seed_workflow_with_job,
        test_seed_rule_new,
        test_seed_rule_existing,
        test_seed_validation,
    ]
    all_results.extend(run_tests(seeder_tests, client))

    # Shared Fixture Tests
    print_header("3. Shared Fixture Tests")
    fixture_tests = [
        test_shared_workflow_fixture,
        test_shared_validation_fixture,
        test_docs_workflow_fixture,
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
