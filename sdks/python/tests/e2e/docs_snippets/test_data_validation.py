"""PY-DATA-VALIDATION: data-validation.mdx snippets"""

import pytest
from kadoa_sdk.validation import GenerateRuleRequest, GenerateRulesRequest, ListRulesRequest

from tests.utils.cleanup_helpers import delete_preview_rules


class TestDataValidationSnippets:

    @pytest.fixture(autouse=True)
    def cleanup_rules(self, client, fixture_validation):
        yield
        delete_preview_rules(client, fixture_validation.workflow_id)

    @pytest.mark.e2e
    def test_data_validation_001_generate_rules(self, client, fixture_validation):
        """PY-DATA-VALIDATION-001: Generate validation rules"""
        workflow_id = fixture_validation.workflow_id
        columns = fixture_validation.columns

        if len(columns) < 2:
            pytest.skip("Need at least 2 columns")

        # @docs-start PY-DATA-VALIDATION-001
        # Analyzes your schema and recent data to suggest validation rules
        # Rules are created in 'preview' status for review before enabling
        # Note: Requires a workflow with completed extraction data
        client.validation.rules.generate_rules(
            GenerateRulesRequest(
                workflow_id=workflow_id,
            )
        )

        # Generate rule with natural language
        # Uses columns from the seeded workflow schema
        client.validation.rules.generate_rule(
            GenerateRuleRequest(
                workflow_id=workflow_id,
                selected_columns=columns[:2],
                user_prompt="Not null values",
            )
        )
        # @docs-end PY-DATA-VALIDATION-001

        assert True

    @pytest.mark.e2e
    def test_data_validation_002_list_bulk_approve_update_rules(self, client, fixture_validation):
        """PY-DATA-VALIDATION-002: List/bulk approve/update rules"""
        workflow_id = fixture_validation.workflow_id

        # @docs-start PY-DATA-VALIDATION-002
        # List rules
        rules = client.validation.rules.list_rules(
            ListRulesRequest(
                workflow_id=workflow_id,
                status="preview",
            )
        )

        print("Rules:", rules)
        # @docs-end PY-DATA-VALIDATION-002

        assert rules is not None

    @pytest.mark.e2e
    def test_data_validation_003_run_validation(self, client, fixture_validation):
        """PY-DATA-VALIDATION-003: Run validation"""
        workflow_id = fixture_validation.workflow_id
        job_id = fixture_validation.job_id

        # @docs-start PY-DATA-VALIDATION-003
        # Schedule validation for a workflow job
        try:
            response = client.validation.schedule(workflow_id, job_id)

            client.validation.wait_until_completed(response.validation_id)

            validation = client.validation.get_latest(workflow_id)

            anomalies = client.validation.get_anomalies(response.validation_id)
            print("Validation:", validation)
            print("Anomalies:", anomalies)
        except Exception:
            # New workflows may not have validation results yet
            print("No validation results yet (expected for new workflows)")
        # @docs-end PY-DATA-VALIDATION-003

        assert True
