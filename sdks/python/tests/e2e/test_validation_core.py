"""
E2E tests for validation core functionality matching Node.js structure.
"""

import pytest

from kadoa_sdk.validation import ListWorkflowValidationsRequest
from tests.utils.shared_fixtures import (
    SharedValidationFixture,
    get_shared_validation_fixture,
)


@pytest.mark.e2e
class TestValidationCore:
    """E2E tests for validation core functionality."""

    @pytest.fixture(scope="class")
    def fixture(self, client) -> SharedValidationFixture:
        """Get shared validation fixture for read-only tests."""
        return get_shared_validation_fixture(client)

    @pytest.mark.integration
    def test_should_list_all_workflow_validations(self, client, fixture):
        """Should list all workflow validations."""
        result = client.validation.list_workflow_validations(
            ListWorkflowValidationsRequest(
                workflow_id=fixture.workflow_id,
                job_id=fixture.job_id,
            )
        )

        assert result is not None
        # Access data attribute - may be data, validations, or direct list
        validations_data = (
            getattr(result, "data", None)
            if hasattr(result, "data")
            else (result.get("data") if isinstance(result, dict) else None) or result
        )
        if isinstance(validations_data, list):
            assert len(validations_data) > 0
        elif hasattr(validations_data, "__len__"):
            assert len(validations_data) > 0

    @pytest.mark.integration
    def test_should_get_validation_details_using_validation_id(self, client, fixture):
        """Should get validation details using validationId."""
        result = client.validation.get_validation_details(fixture.validation_id)

        assert result is not None
        # Access id attribute - may be id, _id, or validation_id
        result_id = (
            getattr(result, "id", None)
            or getattr(result, "_id", None)
            or getattr(result, "validation_id", None)
            or (result.get("id") if isinstance(result, dict) else None)
            or (result.get("_id") if isinstance(result, dict) else None)
            or (result.get("validation_id") if isinstance(result, dict) else None)
        )
        assert result_id == fixture.validation_id

        # Access workflow_id and job_id
        result_workflow_id = (
            getattr(result, "workflow_id", None)
            or getattr(result, "workflowId", None)
            or (result.get("workflow_id") if isinstance(result, dict) else None)
            or (result.get("workflowId") if isinstance(result, dict) else None)
        )
        assert result_workflow_id == fixture.workflow_id

        result_job_id = (
            getattr(result, "job_id", None)
            or getattr(result, "jobId", None)
            or (result.get("job_id") if isinstance(result, dict) else None)
            or (result.get("jobId") if isinstance(result, dict) else None)
        )
        assert result_job_id == fixture.job_id

    # Covered by docs_snippets: PY-DATA-VALIDATION-003

    @pytest.mark.integration
    def test_should_get_latest_validation_using_workflow_id_and_job_id(self, client, fixture):
        """Should get latest validation using workflowId and jobId."""
        result = client.validation.get_latest(fixture.workflow_id, fixture.job_id)

        assert result is not None
        # Access workflow_id
        result_workflow_id = (
            getattr(result, "workflow_id", None)
            or getattr(result, "workflowId", None)
            or (result.get("workflow_id") if isinstance(result, dict) else None)
            or (result.get("workflowId") if isinstance(result, dict) else None)
        )
        assert result_workflow_id == fixture.workflow_id

        # Access job_id
        result_job_id = (
            getattr(result, "job_id", None)
            or getattr(result, "jobId", None)
            or (result.get("job_id") if isinstance(result, dict) else None)
            or (result.get("jobId") if isinstance(result, dict) else None)
        )
        assert result_job_id == fixture.job_id

    @pytest.mark.integration
    def test_should_get_validation_anomalies_using_validation_id(self, client, fixture):
        """Should get validation anomalies using validationId."""
        result = client.validation.get_anomalies(fixture.validation_id)

        assert result is not None
        # Access anomalies_by_rule attribute (don't use `or` chain - empty list is falsy)
        anomalies_by_rule = getattr(result, "anomalies_by_rule", None)
        if anomalies_by_rule is None:
            anomalies_by_rule = getattr(result, "anomaliesByRule", None)
        if anomalies_by_rule is None and isinstance(result, dict):
            anomalies_by_rule = result.get("anomaliesByRule")
        # Anomalies may be 0 depending on data - verify API returns valid structure
        assert anomalies_by_rule is not None
        assert isinstance(anomalies_by_rule, list)

    @pytest.mark.integration
    def test_should_get_validation_anomalies_by_rule_using_validation_id_and_rule_name(
        self, client, fixture
    ):
        """Should get validation anomalies by rule using validationId and ruleName."""
        result = client.validation.get_anomalies_by_rule(fixture.validation_id, fixture.rule_name)

        assert result is not None
        # Access rule_name attribute
        rule_name = (
            getattr(result, "rule_name", None)
            or getattr(result, "ruleName", None)
            or (result.get("rule_name") if isinstance(result, dict) else None)
            or (result.get("ruleName") if isinstance(result, dict) else None)
        )
        assert rule_name == fixture.rule_name

        # Access anomalies attribute - may be None or empty if no anomalies
        anomalies = getattr(result, "anomalies", None) or (
            result.get("anomalies") if isinstance(result, dict) else None
        )
        # Just verify the method returns a result object with the rule name
        assert result is not None
