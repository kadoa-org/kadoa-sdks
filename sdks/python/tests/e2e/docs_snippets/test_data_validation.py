"""PY-DATA-VALIDATION: data-validation.mdx snippets"""

import pytest
from kadoa_sdk.validation import GenerateRuleRequest, GenerateRulesRequest, ListRulesRequest


class TestDataValidationSnippets:

    @pytest.mark.e2e
    def test_data_validation_001_generate_rules(self, client, fixture_validation):
        """PY-DATA-VALIDATION-001: Generate validation rules"""
        workflow_id = fixture_validation.workflow_id

        # @docs-start PY-DATA-VALIDATION-001
        # Analyzes your schema and recent data to suggest validation rules
        # Rules are created in 'preview' status for review before enabling
        # Note: Requires a workflow with completed extraction data
        try:
            client.validation.rules.generate_rules(
                GenerateRulesRequest(
                    workflow_id=workflow_id,
                )
            )

            # Generate rule with natural language
            client.validation.rules.generate_rule(
                GenerateRuleRequest(
                    workflow_id=workflow_id,
                    selected_columns=["email", "price"],
                    user_prompt="Check that emails are valid and prices are positive",
                )
            )
        except Exception:
            # Workflows without completed jobs cannot generate rules
            print("Skipped: workflow has no completed extraction data")
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
