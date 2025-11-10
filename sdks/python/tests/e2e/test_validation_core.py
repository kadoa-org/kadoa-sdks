"""
E2E tests for validation core functionality matching Node.js structure.
"""

import pytest
import pytest_asyncio

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.validation import ListWorkflowValidationsRequest
from tests.utils.seeder import seed_rule, seed_validation, seed_workflow


@pytest.mark.e2e
class TestValidationCore:
    """E2E tests for validation core functionality."""

    @pytest_asyncio.fixture(scope="class")
    async def client(self):
        """Initialize client for all tests in this class."""
        settings = get_settings()
        client = KadoaClient(
            KadoaClientConfig(
                api_key=settings.api_key,
                timeout=30,
            )
        )

        yield client

        client.dispose()

    @pytest_asyncio.fixture(scope="class")
    async def workflow_id(self, client):
        """Create a test workflow for validation core tests."""
        result = seed_workflow(
            "test-workflow-validation-core",
            client,
            run_job=True,
        )
        yield result["workflow_id"]

    @pytest_asyncio.fixture(scope="class")
    async def job_id(self, client, workflow_id):
        """Get job ID from workflow."""
        workflow_result = seed_workflow(
            "test-workflow-validation-core",
            client,
            run_job=True,
        )
        assert workflow_result.get("job_id"), "Job ID is not set"
        yield workflow_result["job_id"]

    @pytest.fixture(scope="class")
    def rule_id(self, client, workflow_id):
        """Create a test rule for validation core tests."""
        rule_id = seed_rule("test-rule-validation-core", workflow_id, client)
        yield rule_id

    @pytest.fixture(scope="class")
    def validation_id(self, client, workflow_id, job_id):
        """Create a test validation for validation core tests."""
        validation_id = seed_validation(workflow_id, job_id, client)
        yield validation_id

    @pytest.mark.integration
    def test_should_list_all_workflow_validations(self, client, workflow_id, job_id):
        """Should list all workflow validations."""
        result = client.validation.list_workflow_validations(
            ListWorkflowValidationsRequest(
                workflow_id=workflow_id,
                job_id=job_id,
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
    def test_should_get_validation_details_using_validation_id(
        self, client, validation_id, workflow_id, job_id
    ):
        """Should get validation details using validationId."""
        result = client.validation.get_validation_details(validation_id)

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
        assert result_id == validation_id

        # Access workflow_id and job_id
        result_workflow_id = (
            getattr(result, "workflow_id", None)
            or getattr(result, "workflowId", None)
            or (result.get("workflow_id") if isinstance(result, dict) else None)
            or (result.get("workflowId") if isinstance(result, dict) else None)
        )
        assert result_workflow_id == workflow_id

        result_job_id = (
            getattr(result, "job_id", None)
            or getattr(result, "jobId", None)
            or (result.get("job_id") if isinstance(result, dict) else None)
            or (result.get("jobId") if isinstance(result, dict) else None)
        )
        assert result_job_id == job_id

    @pytest.mark.integration
    def test_should_get_latest_validation_using_only_workflow_id(self, client, workflow_id, job_id):
        """Should get latest validation using only workflowId."""
        result = client.validation.get_latest(workflow_id)

        assert result is not None
        # Access workflow_id
        result_workflow_id = (
            getattr(result, "workflow_id", None)
            or getattr(result, "workflowId", None)
            or (result.get("workflow_id") if isinstance(result, dict) else None)
            or (result.get("workflowId") if isinstance(result, dict) else None)
        )
        assert result_workflow_id == workflow_id

        # Access job_id - when calling get_latest() with only workflow_id,
        # we should verify a job_id exists but not assert a specific one,
        # as it may return the latest validation from any job for that workflow
        result_job_id = (
            getattr(result, "job_id", None)
            or getattr(result, "jobId", None)
            or (result.get("job_id") if isinstance(result, dict) else None)
            or (result.get("jobId") if isinstance(result, dict) else None)
        )
        assert result_job_id is not None  # Just verify job_id exists, not a specific value

    @pytest.mark.integration
    def test_should_get_latest_validation_using_workflow_id_and_job_id(
        self, client, workflow_id, job_id
    ):
        """Should get latest validation using workflowId and jobId."""
        result = client.validation.get_latest(workflow_id, job_id)

        assert result is not None
        # Access workflow_id
        result_workflow_id = (
            getattr(result, "workflow_id", None)
            or getattr(result, "workflowId", None)
            or (result.get("workflow_id") if isinstance(result, dict) else None)
            or (result.get("workflowId") if isinstance(result, dict) else None)
        )
        assert result_workflow_id == workflow_id

        # Access job_id
        result_job_id = (
            getattr(result, "job_id", None)
            or getattr(result, "jobId", None)
            or (result.get("job_id") if isinstance(result, dict) else None)
            or (result.get("jobId") if isinstance(result, dict) else None)
        )
        assert result_job_id == job_id

    @pytest.mark.integration
    def test_should_get_validation_anomalies_using_validation_id(self, client, validation_id):
        """Should get validation anomalies using validationId."""
        result = client.validation.get_anomalies(validation_id)

        assert result is not None
        # Access anomalies_by_rule attribute
        anomalies_by_rule = (
            getattr(result, "anomalies_by_rule", None)
            or getattr(result, "anomaliesByRule", None)
            or (result.get("anomalies_by_rule") if isinstance(result, dict) else None)
            or (result.get("anomaliesByRule") if isinstance(result, dict) else None)
        )
        # Anomalies may be None or empty if validation has no anomalies
        # Just verify the method returns a result object
        assert result is not None

    @pytest.mark.integration
    def test_should_get_validation_anomalies_by_rule_using_validation_id_and_rule_name(
        self, client, validation_id
    ):
        """Should get validation anomalies by rule using validationId and ruleName."""
        result = client.validation.get_anomalies_by_rule(validation_id, "test-rule-validation-core")

        assert result is not None
        # Access rule_name attribute
        rule_name = (
            getattr(result, "rule_name", None)
            or getattr(result, "ruleName", None)
            or (result.get("rule_name") if isinstance(result, dict) else None)
            or (result.get("ruleName") if isinstance(result, dict) else None)
        )
        assert rule_name == "test-rule-validation-core"

        # Access anomalies attribute - may be None or empty if no anomalies
        anomalies = getattr(result, "anomalies", None) or (
            result.get("anomalies") if isinstance(result, dict) else None
        )
        # Just verify the method returns a result object with the rule name
        assert result is not None
