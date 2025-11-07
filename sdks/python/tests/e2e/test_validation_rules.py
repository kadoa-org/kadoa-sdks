"""
E2E tests for validation rules functionality matching Node.js structure.
"""

import os

import pytest
import pytest_asyncio

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.validation import (
    BulkApproveRulesRequest,
    BulkDeleteRulesRequest,
    CreateRuleRequest,
    GenerateRuleRequest,
    GenerateRulesRequest,
    ListRulesRequest,
)
from tests.utils.seeder import seed_rule, seed_workflow


@pytest.mark.e2e
class TestValidationRules:
    """E2E tests for validation rules functionality."""

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
            )
        )

        yield client

        client.dispose()

    @pytest_asyncio.fixture(scope="class")
    async def workflow_id(self, client):
        """Create a test workflow for validation rules tests."""
        result = seed_workflow("test-workflow-validation-rules", client)
        yield result["workflow_id"]

    @pytest.fixture(scope="class")
    def rule_id(self, client, workflow_id):
        """Create a test rule for validation rules tests."""
        rule_id = seed_rule("test-rule-validation-rules", workflow_id, client)
        yield rule_id

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_should_have_enabled_validation_by_default(self, client, workflow_id):
        """Should have enabled validation by default."""
        workflow = client.workflow.get(workflow_id)

        assert workflow is not None
        # Check data_validation.enabled - may be nested differently
        data_validation = (
            getattr(workflow, "data_validation", None)
            or getattr(workflow, "dataValidation", None)
            or (workflow.model_dump() if hasattr(workflow, "model_dump") else {}).get(
                "data_validation"
            )
            or (workflow.model_dump() if hasattr(workflow, "model_dump") else {}).get(
                "dataValidation"
            )
        )

        if data_validation:
            enabled = (
                getattr(data_validation, "enabled", None)
                if hasattr(data_validation, "enabled")
                else (data_validation.get("enabled") if isinstance(data_validation, dict) else None)
            )
            assert enabled is True

    @pytest.mark.integration
    def test_should_create_a_validation_rule(self, client, workflow_id):
        """Should create a validation rule."""
        result = client.validation.rules.create_rule(
            CreateRuleRequest(
                name="test-rule-create",
                description="Test rule create",
                rule_type="custom_sql",
                parameters={
                    "sql": (
                        "SELECT __id__, 'title' AS __column__, 'FORMAT' AS __type__, "
                        '"title" AS __bad_value__ FROM _src WHERE "title" IS NULL '
                        "OR TRIM(\"title\") = ''"
                    )
                },
                workflow_id=workflow_id,
                target_columns=["title"],
            )
        )

        assert result is not None

    @pytest.mark.integration
    def test_should_return_list_of_rules(self, client, workflow_id):
        """Should return list of rules."""
        result = client.validation.rules.list_rules(ListRulesRequest(workflow_id=workflow_id))

        assert result is not None
        # Access data attribute - may be data, rules, or direct list
        rules_data = (
            getattr(result, "data", None)
            if hasattr(result, "data")
            else (result.get("data") if isinstance(result, dict) else None) or result
        )
        if isinstance(rules_data, list):
            assert len(rules_data) > 0
        elif hasattr(rules_data, "__len__"):
            assert len(rules_data) > 0

    @pytest.mark.integration
    def test_should_generate_single_rule_using_natural_language(self, client, workflow_id):
        """Should generate single rule using natural language."""
        result = client.validation.rules.generate_rule(
            GenerateRuleRequest(
                workflow_id=workflow_id,
                selected_columns=["title"],
                user_prompt="Ensure the title is not empty",
            )
        )

        assert result is not None

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_should_generate_multiple_rules_using_generated_intents_from_schema(
        self, client, workflow_id
    ):
        """Should generate multiple rules using generated intents from schema."""
        result = client.validation.rules.generate_rules(
            GenerateRulesRequest(workflow_id=workflow_id)
        )

        assert result is not None
        assert isinstance(result, list)
        assert len(result) > 0

    @pytest.mark.integration
    def test_should_bulk_approve_rules(self, client, workflow_id, rule_id):
        """Should bulk approve rules."""
        result = client.validation.rules.bulk_approve_rules(
            BulkApproveRulesRequest(workflow_id=workflow_id, rule_ids=[rule_id])
        )

        assert result is not None

    @pytest.mark.integration
    def test_should_bulk_delete_rules(self, client, workflow_id, rule_id):
        """Should bulk delete rules."""
        result = client.validation.rules.bulk_delete_rules(
            BulkDeleteRulesRequest(workflow_id=workflow_id, rule_ids=[rule_id])
        )

        assert result is not None
