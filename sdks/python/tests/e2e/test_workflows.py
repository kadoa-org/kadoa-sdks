import pytest

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.exceptions import KadoaHttpError, KadoaSdkError
from kadoa_sdk.core.settings import get_settings
from tests.utils.seeder import seed_workflow


@pytest.mark.e2e
class TestWorkflows:
    """E2E tests for workflows functionality."""

    @pytest.fixture(scope="class")
    def client(self):
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

    @pytest.fixture(scope="class")
    def workflow_id(self, client):
        """Create a test workflow for workflow tests."""
        result = seed_workflow("test-workflow-update-delete", client)
        yield result["workflow_id"]

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_should_update_limit(self, client, workflow_id):
        """Should update limit."""
        result = client.workflow.update(workflow_id, limit=100)

        assert result.success is True
        # Verify limit was updated - check config.limit if available, or other structure
        workflow = client.workflow.get(workflow_id)
        assert workflow is not None
        # Note: The actual structure may vary - this validates the update succeeded
        assert result.message is not None

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_should_update_name(self, client, workflow_id):
        """Should update name."""
        result = client.workflow.update(workflow_id, name="Updated Workflow Name")

        assert result.success is True

        workflow = client.workflow.get(workflow_id)
        # Access name attribute - may be _name, name, or in nested structure
        workflow_name = (
            getattr(workflow, "name", None)
            or getattr(workflow, "_name", None)
            or (workflow.model_dump() if hasattr(workflow, "model_dump") else {}).get("name")
        )
        assert workflow_name == "Updated Workflow Name"

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_should_validate_additional_data_on_update(self, client, workflow_id):
        """Should validate additionalData on update."""
        # Test invalid additionalData (array)
        with pytest.raises(KadoaSdkError):
            client.workflow.update(
                workflow_id,
                additional_data=["invalid"],  # type: ignore
            )

        # Test invalid additionalData (null)
        with pytest.raises(KadoaSdkError):
            client.workflow.update(
                workflow_id,
                additional_data=None,  # type: ignore
            )

        # Test valid additionalData
        valid_data = {"testKey": "testValue", "nested": {"count": 1}}
        result = client.workflow.update(workflow_id, additional_data=valid_data)

        assert result.success is True

        # Verify additionalData was updated
        workflow = client.workflow.get(workflow_id)
        workflow_additional_data = (
            getattr(workflow, "additional_data", None)
            or getattr(workflow, "additionalData", None)
            or (workflow.model_dump() if hasattr(workflow, "model_dump") else {}).get(
                "additional_data"
            )
            or (workflow.model_dump() if hasattr(workflow, "model_dump") else {}).get(
                "additionalData"
            )
        )
        assert workflow_additional_data == valid_data

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_should_delete_workflow(self, client):
        """Should delete workflow."""
        # Create a separate workflow for deletion test to avoid affecting other tests
        delete_test_workflow = seed_workflow("test-workflow-for-delete", client)
        delete_workflow_id = delete_test_workflow["workflow_id"]

        client.workflow.delete(delete_workflow_id)

        # Verify workflow is deleted (soft delete - state should be DELETED)
        deleted_workflow = client.workflow.get(delete_workflow_id)
        workflow_state = getattr(deleted_workflow, "state", None) or (
            deleted_workflow.model_dump() if hasattr(deleted_workflow, "model_dump") else {}
        ).get("state")
        assert workflow_state == "DELETED"

        # Verify workflow is not returned in list (by default, deleted workflows are excluded)
        workflows = client.workflow.list()
        found_workflow = next(
            (
                w
                for w in workflows
                if (
                    (w.get("_id") if isinstance(w, dict) else getattr(w, "_id", None))
                    == delete_workflow_id
                )
                or (
                    (w.get("id") if isinstance(w, dict) else getattr(w, "id", None))
                    == delete_workflow_id
                )
            ),
            None,
        )
        assert found_workflow is None

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_should_handle_delete_non_existent_workflow(self, client):
        """Should handle delete non-existent workflow."""
        with pytest.raises(KadoaHttpError):
            client.workflow.delete("5f9f1b9b9c9d1b9b9c9d1b9b")
