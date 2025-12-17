import time

import pytest
from pydantic import ValidationError

from kadoa_sdk.core.exceptions import KadoaHttpError, KadoaSdkError
from kadoa_sdk.extraction.extraction_acl import UpdateWorkflowRequest
from tests.utils.seeder import seed_workflow


@pytest.mark.e2e
class TestWorkflowUpdateOperations:
    """Tests that update isolated workflows."""

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_should_update_limit(self, client):
        """Should update limit."""
        # Create isolated workflow for update test
        unique_name = f"test-update-limit-{int(time.time() * 1000)}"
        result = seed_workflow(unique_name, client)
        workflow_id = result["workflow_id"]

        try:
            update_result = client.workflow.update(
                workflow_id, input=UpdateWorkflowRequest(limit=100)
            )

            assert update_result.success is True
            workflow = client.workflow.get(workflow_id)
            assert workflow is not None
            assert update_result.message is not None
        finally:
            client.workflow.delete(workflow_id)

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_should_update_name(self, client):
        """Should update name."""
        # Create isolated workflow for update test
        unique_name = f"test-update-name-{int(time.time() * 1000)}"
        result = seed_workflow(unique_name, client)
        workflow_id = result["workflow_id"]

        try:
            update_result = client.workflow.update(
                workflow_id, input=UpdateWorkflowRequest(name="Updated Workflow Name")
            )

            assert update_result.success is True

            workflow = client.workflow.get(workflow_id)
            workflow_name = (
                getattr(workflow, "name", None)
                or getattr(workflow, "_name", None)
                or (workflow.model_dump() if hasattr(workflow, "model_dump") else {}).get("name")
            )
            assert workflow_name == "Updated Workflow Name"
        finally:
            client.workflow.delete(workflow_id)

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_should_validate_additional_data_on_update(self, client):
        """Should validate additionalData on update."""
        # Create isolated workflow for update test
        unique_name = f"test-update-additional-data-{int(time.time() * 1000)}"
        result = seed_workflow(unique_name, client)
        workflow_id = result["workflow_id"]

        try:
            # Test invalid additionalData (array) - Pydantic validates on object creation
            with pytest.raises(ValidationError):
                UpdateWorkflowRequest(additional_data=["invalid"])  # type: ignore

            # Test invalid additionalData (null) - SDK validates this at runtime
            with pytest.raises((ValidationError, KadoaSdkError)):
                client.workflow.update(
                    workflow_id, input=UpdateWorkflowRequest(additional_data=None)  # type: ignore
                )

            # Test valid additionalData (dict)
            valid_data = {"testKey": "testValue", "nested": {"count": 1}}
            update_result = client.workflow.update(
                workflow_id, input=UpdateWorkflowRequest(additional_data=valid_data)
            )

            assert update_result.success is True

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
        finally:
            client.workflow.delete(workflow_id)


@pytest.mark.e2e
class TestWorkflowDestructiveOperations:
    """Tests that create/delete isolated workflows."""

    @pytest.mark.integration
    @pytest.mark.timeout(120)
    def test_should_delete_workflow(self, client):
        """Should delete workflow."""
        # Create isolated workflow for deletion
        unique_name = f"test-workflow-delete-{int(time.time() * 1000)}"
        result = seed_workflow(unique_name, client)
        workflow_id = result["workflow_id"]

        client.workflow.delete(workflow_id)

        # Verify workflow is not returned in list (deleted workflows excluded by default)
        workflows = client.workflow.list(filters=None)
        found_workflow = next(
            (
                w
                for w in workflows
                if (
                    (w.get("_id") if isinstance(w, dict) else getattr(w, "_id", None))
                    == workflow_id
                )
                or (
                    (w.get("id") if isinstance(w, dict) else getattr(w, "id", None))
                    == workflow_id
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
