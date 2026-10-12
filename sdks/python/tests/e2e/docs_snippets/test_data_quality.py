"""PY-DATA-QUALITY: sdk/data-quality/overview.mdx snippets"""

import time

import pytest

from tests.utils.seeder import seed_workflow


@pytest.fixture(scope="module")
def dq_workflow_id(client):
    workflow_id = seed_workflow(f"docs-data-quality-{int(time.time())}", client)["workflow_id"]
    yield workflow_id
    client.workflow.delete(workflow_id)


class TestDataQualitySnippets:
    @pytest.mark.e2e
    def test_data_quality_001_set_rules(self, client, dq_workflow_id):
        """PY-DATA-QUALITY-001: Set rules for fields"""
        workflow_id = dq_workflow_id

        # @docs-preamble PY-DATA-QUALITY-001
        # from datetime import datetime, timezone
        #
        # from kadoa_sdk import KadoaClient, KadoaClientConfig
        #
        # client = KadoaClient(KadoaClientConfig(api_key="YOUR_API_KEY"))
        # workflow_id = "WORKFLOW_ID"
        # @docs-preamble-end PY-DATA-QUALITY-001
        from datetime import datetime, timezone

        # @docs-start PY-DATA-QUALITY-001
        # Every rule records who set it and when. The API expects UTC ending in "Z"
        edited = {
            "editedBy": "user",
            "editedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

        rules = client.data_quality.upsert_rules(
            workflow_id,
            {
                "title": {
                    "kind": "STRING",
                    "presence": {"target": 100, **edited},
                    "maxLength": {"value": 120, **edited},
                },
                "link": {
                    "kind": "STRING",
                    "format": {
                        "kind": "FORMAT",
                        "source": {"kind": "PRESET", "preset": "url"},
                        **edited,
                    },
                },
            },
        )

        print(list(rules))  # ['title', 'link']
        # @docs-end PY-DATA-QUALITY-001

        assert rules["title"]["kind"] == "STRING"
        assert rules["link"]["kind"] == "STRING"

    @pytest.mark.e2e
    def test_data_quality_002_read_rules(self, client, dq_workflow_id):
        """PY-DATA-QUALITY-002: Read the rules of a workflow"""
        workflow_id = dq_workflow_id

        # @docs-preamble PY-DATA-QUALITY-002
        # from kadoa_sdk import KadoaClient, KadoaClientConfig
        #
        # client = KadoaClient(KadoaClientConfig(api_key="YOUR_API_KEY"))
        # workflow_id = "WORKFLOW_ID"
        # @docs-preamble-end PY-DATA-QUALITY-002

        # @docs-start PY-DATA-QUALITY-002
        # None when the workflow has no rules
        rules = client.data_quality.get_rules(workflow_id)

        for field, field_rules in (rules or {}).items():
            print(field, field_rules["kind"], field_rules.get("presence", {}).get("target"))
        # @docs-end PY-DATA-QUALITY-002

        assert rules["title"]["presence"]["target"] == 100

    @pytest.mark.e2e
    def test_data_quality_003_delete_field_rules(self, client, dq_workflow_id):
        """PY-DATA-QUALITY-003: Remove the rules of one field"""
        workflow_id = dq_workflow_id

        # @docs-preamble PY-DATA-QUALITY-003
        # from kadoa_sdk import KadoaClient, KadoaClientConfig
        #
        # client = KadoaClient(KadoaClientConfig(api_key="YOUR_API_KEY"))
        # workflow_id = "WORKFLOW_ID"
        # @docs-preamble-end PY-DATA-QUALITY-003

        # @docs-start PY-DATA-QUALITY-003
        # Other fields keep their rules
        remaining = client.data_quality.delete_field_rules(workflow_id, "link")

        print(list(remaining))  # ['title']
        # @docs-end PY-DATA-QUALITY-003

        assert "link" not in remaining
        assert remaining["title"]["kind"] == "STRING"
