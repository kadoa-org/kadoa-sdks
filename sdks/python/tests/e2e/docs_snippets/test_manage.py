"""PY-WORKFLOWS-MANAGE: manage.mdx snippets."""

import pytest

from kadoa_sdk import ExtractionOptions, FetchDataOptions
from kadoa_sdk.workflows import ListWorkflowsRequest, UpdateWorkflowRequest


class TestManageWorkflowSnippets:
    @pytest.mark.e2e
    def test_manage_001_list_workflows(self, client) -> None:
        # @docs-preamble PY-WORKFLOWS-MANAGE-001
        # from kadoa_sdk import KadoaClient, KadoaClientConfig
        # from kadoa_sdk.workflows import ListWorkflowsRequest
        #
        # client = KadoaClient(config=KadoaClientConfig(api_key="YOUR_API_KEY"))
        # @docs-preamble-end PY-WORKFLOWS-MANAGE-001

        # @docs-start PY-WORKFLOWS-MANAGE-001
        workflows = client.workflow.list(ListWorkflowsRequest(limit=100))

        for workflow in workflows:
            print(f"{workflow.id}: {workflow.name}")
        # @docs-end PY-WORKFLOWS-MANAGE-001

        assert isinstance(workflows, list)

    @pytest.mark.e2e
    def test_manage_002_get_workflow(self, client, workflow_id: str) -> None:
        # @docs-preamble PY-WORKFLOWS-MANAGE-002
        # from kadoa_sdk import KadoaClient, KadoaClientConfig
        #
        # client = KadoaClient(config=KadoaClientConfig(api_key="YOUR_API_KEY"))
        # workflow_id = "YOUR_WORKFLOW_ID"
        # @docs-preamble-end PY-WORKFLOWS-MANAGE-002

        # @docs-start PY-WORKFLOWS-MANAGE-002
        workflow = client.workflow.get(workflow_id)
        # @docs-end PY-WORKFLOWS-MANAGE-002

        assert workflow.id == workflow_id

    @pytest.mark.e2e
    def test_manage_003_pause_and_resume(self, client, workflow_id: str) -> None:
        client.workflow.wait(workflow_id, timeout_ms=30 * 60 * 1000)
        if client.workflow.get(workflow_id).state != "ACTIVE":
            client.workflow.resume(workflow_id)
            client.workflow.wait(
                workflow_id,
                target_state="ACTIVE",
                timeout_ms=30 * 60 * 1000,
            )

        # @docs-preamble PY-WORKFLOWS-MANAGE-003
        # from kadoa_sdk import KadoaClient, KadoaClientConfig
        #
        # client = KadoaClient(config=KadoaClientConfig(api_key="YOUR_API_KEY"))
        # workflow_id = "YOUR_WORKFLOW_ID"
        # @docs-preamble-end PY-WORKFLOWS-MANAGE-003

        # @docs-start PY-WORKFLOWS-MANAGE-003
        client.workflow.pause(workflow_id)
        client.workflow.resume(workflow_id)
        # @docs-end PY-WORKFLOWS-MANAGE-003

        assert client.workflow.get(workflow_id) is not None

    @pytest.mark.e2e
    def test_manage_004_delete_workflow(self, client) -> None:
        result = client.extraction.submit(
            ExtractionOptions(
                urls=["https://sandbox.kadoa.com/careers"],
                name="Docs Manage Delete",
            )
        )
        workflow_id = result.workflow_id

        # @docs-preamble PY-WORKFLOWS-MANAGE-004
        # from kadoa_sdk import KadoaClient, KadoaClientConfig
        #
        # client = KadoaClient(config=KadoaClientConfig(api_key="YOUR_API_KEY"))
        # workflow_id = "YOUR_WORKFLOW_ID"
        # @docs-preamble-end PY-WORKFLOWS-MANAGE-004

        # @docs-start PY-WORKFLOWS-MANAGE-004
        client.workflow.delete(workflow_id)
        # @docs-end PY-WORKFLOWS-MANAGE-004

        assert client.workflow.get(workflow_id).state == "DELETED"

    @pytest.mark.e2e
    def test_manage_005_fetch_all_data(self, client, monkeypatch, workflow_id: str) -> None:
        workflow = client.workflow.get(workflow_id)
        monkeypatch.setattr(client.workflow, "list", lambda _filters: [workflow])

        # @docs-preamble PY-WORKFLOWS-MANAGE-005
        # from kadoa_sdk import FetchDataOptions, KadoaClient, KadoaClientConfig
        # from kadoa_sdk.workflows import ListWorkflowsRequest
        #
        # client = KadoaClient(config=KadoaClientConfig(api_key="YOUR_API_KEY"))
        # @docs-preamble-end PY-WORKFLOWS-MANAGE-005

        # @docs-start PY-WORKFLOWS-MANAGE-005
        workflows = client.workflow.list(ListWorkflowsRequest(limit=100))

        for workflow in workflows:
            data = client.extraction.fetch_all_data(FetchDataOptions(workflow_id=workflow.id))
            print(f"{workflow.name}: {len(data)} records")
        # @docs-end PY-WORKFLOWS-MANAGE-005

        assert isinstance(workflows, list)

    @pytest.mark.e2e
    def test_manage_006_update_workflow(self, client, workflow_id: str) -> None:
        # @docs-preamble PY-WORKFLOWS-MANAGE-006
        # from kadoa_sdk import KadoaClient, KadoaClientConfig
        # from kadoa_sdk.workflows import UpdateWorkflowRequest
        #
        # client = KadoaClient(config=KadoaClientConfig(api_key="YOUR_API_KEY"))
        # workflow_id = "YOUR_WORKFLOW_ID"
        # @docs-preamble-end PY-WORKFLOWS-MANAGE-006

        # @docs-start PY-WORKFLOWS-MANAGE-006
        updated = client.workflow.update(
            workflow_id,
            UpdateWorkflowRequest(name="New Name", update_interval="DAILY"),
        )
        # @docs-end PY-WORKFLOWS-MANAGE-006

        assert updated.success is True
