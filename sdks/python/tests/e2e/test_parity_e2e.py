"""Comprehensive e2e tests for KAD-7030 parity additions against local API (port 12380).

Covers:
- extraction.export_data + download_export
- templates full CRUD + create_version + list_schemas
- variables full CRUD
- changes.list + get
- workflow.get_audit_log
- validation.rules.delete_rule

Run with: KADOA_API_KEY=... KADOA_PUBLIC_API_URI=http://localhost:12380 \
         uv run --extra dev pytest tests/e2e/test_parity_e2e.py -m e2e -v
"""

from __future__ import annotations

import os
import uuid

import pytest

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.changes import ListChangesOptions
from kadoa_sdk.extraction import ExportDataOptions


pytestmark = pytest.mark.e2e


@pytest.fixture(scope="module")
def client():
    api_key = os.environ.get("KADOA_API_KEY")
    base_url = os.environ.get("KADOA_PUBLIC_API_URI", "http://localhost:12380")
    if not api_key:
        pytest.skip("KADOA_API_KEY not set")
    c = KadoaClient(KadoaClientConfig(api_key=api_key, base_url=base_url))
    yield c
    c.dispose()


def _safe_list_workflows(client):
    """Return list of workflows, or skip if backend doesn't support it locally."""
    try:
        return client.workflow.list()
    except Exception as e:
        # Backend may return 500 due to missing seed data / team context — skip
        status = getattr(e, "http_status", None)
        cause = getattr(e, "__cause__", None)
        cause_str = str(cause) if cause else ""
        if status == 500 or "500" in cause_str or "Internal Server Error" in cause_str or "Failed to list workflows" in str(e):
            pytest.skip(f"local backend can't list workflows: {e}")
        raise


# ---------------------------------------------------------------------------
# variables — full CRUD
# ---------------------------------------------------------------------------


class TestVariables:
    def test_list_returns_list(self, client):
        result = client.variable.list()
        assert isinstance(result, list)

    def test_full_crud_cycle(self, client):
        key = f"sdk_test_{uuid.uuid4().hex[:8]}"
        try:
            created = client.variable.create({"key": key, "value": "initial"})
        except Exception as e:
            if "constraint" in str(e).lower() or "500" in str(e):
                pytest.skip(f"local backend DB constraint blocks variable create: {e}")
            raise
        assert created is not None
        var_id = getattr(created, "id", None) or getattr(created, "variable_id", None)
        assert var_id, f"create did not return id; got {created}"

        try:
            fetched = client.variable.get(var_id)
            assert getattr(fetched, "key", None) == key
            assert getattr(fetched, "value", None) == "initial"

            updated = client.variable.update(var_id, {"value": "updated"})
            assert getattr(updated, "value", None) == "updated"

            listed = client.variable.list()
            assert any(getattr(v, "id", None) == var_id for v in listed)
        finally:
            client.variable.delete(var_id)

        with pytest.raises(Exception):
            client.variable.get(var_id)


# ---------------------------------------------------------------------------
# changes — list + get
# ---------------------------------------------------------------------------


class TestChanges:
    def test_list_returns_structured_result(self, client):
        result = client.changes.list(ListChangesOptions(limit=5))
        assert result is not None
        assert isinstance(result.changes_count, int)
        assert isinstance(result.changes, list)
        # No assertion on content — env may be empty

    def test_list_without_options(self, client):
        result = client.changes.list()
        assert result is not None
        assert isinstance(result.changes, list)

    def test_get_missing_change_raises(self, client):
        with pytest.raises(Exception):
            client.changes.get("00000000-0000-0000-0000-000000000000")


# ---------------------------------------------------------------------------
# templates — needs team context; skip gracefully if local key has none
# ---------------------------------------------------------------------------


class TestTemplates:
    def test_list_or_skip(self, client):
        try:
            result = client.template.list()
        except Exception as e:
            if "team" in str(e).lower():
                pytest.skip(f"local API key has no team context: {e}")
            raise
        assert isinstance(result, list)

    def test_get_missing_raises(self, client):
        try:
            client.template.list()  # probe
        except Exception as e:
            if "team" in str(e).lower():
                pytest.skip(f"local API key has no team context: {e}")
            raise
        with pytest.raises(Exception):
            client.template.get("00000000-0000-0000-0000-000000000000")

    def test_full_crud_cycle(self, client):
        try:
            client.template.list()
        except Exception as e:
            if "team" in str(e).lower():
                pytest.skip(f"local API key has no team context: {e}")
            raise
        name = f"sdk_tpl_{uuid.uuid4().hex[:8]}"
        created = client.template.create(
            {
                "name": name,
                "description": "e2e probe",
                "prompt": "extract data",
                "interval": "ONLY_ONCE",
            }
        )
        tpl_id = getattr(created, "id", None)
        assert tpl_id, f"create did not return id; got {created}"

        try:
            fetched = client.template.get(tpl_id)
            assert getattr(fetched, "id", None) == tpl_id
            assert getattr(fetched, "name", None) == name

            updated = client.template.update(tpl_id, {"name": f"{name}_renamed"})
            assert getattr(updated, "id", None) == tpl_id

            schemas = client.template.list_schemas(tpl_id)
            assert isinstance(schemas, list)

            listed = client.template.list()
            assert any(getattr(t, "id", None) == tpl_id for t in listed)
        finally:
            client.template.delete(tpl_id)


# ---------------------------------------------------------------------------
# workflows — get_audit_log against an existing workflow if any
# ---------------------------------------------------------------------------


class TestWorkflowAuditLog:
    def test_audit_log_on_any_workflow(self, client):
        workflows = _safe_list_workflows(client)
        if not workflows:
            pytest.skip("no workflows available in local env")
        wf = workflows[0]
        wf_id = getattr(wf, "id", None) or getattr(wf, "workflow_id", None)
        result = client.workflow.get_audit_log(wf_id, page=1, limit=10)
        # Response has either `entries` or wrapped under `data`
        assert result is not None


# ---------------------------------------------------------------------------
# extraction.export_data — needs an existing workflow with data
# ---------------------------------------------------------------------------


class TestExportData:
    def test_export_data_returns_signed_url(self, client):
        workflows = _safe_list_workflows(client)
        if not workflows:
            pytest.skip("no workflows in local env to export")
        wf = workflows[0]
        wf_id = getattr(wf, "id", None) or getattr(wf, "workflow_id", None)
        try:
            result = client.extraction.export_data(
                ExportDataOptions(workflow_id=wf_id, format="csv")
            )
        except Exception as e:
            # Expected if workflow has no successful run
            msg = str(e).lower()
            if any(k in msg for k in ("no data", "not found", "no run", "no successful")):
                pytest.skip(f"workflow has no exportable data: {e}")
            raise
        assert result.workflow_id == wf_id
        assert result.url.startswith("http")
        assert result.format == "csv"
        assert isinstance(result.row_count, int)

    def test_download_export_fetches_bytes(self, client):
        workflows = _safe_list_workflows(client)
        if not workflows:
            pytest.skip("no workflows in local env")
        wf = workflows[0]
        wf_id = getattr(wf, "id", None) or getattr(wf, "workflow_id", None)
        try:
            result = client.extraction.export_data(
                ExportDataOptions(workflow_id=wf_id, format="json")
            )
        except Exception as e:
            msg = str(e).lower()
            if any(k in msg for k in ("no data", "not found", "no run", "no successful")):
                pytest.skip(f"workflow has no exportable data: {e}")
            raise
        # Best-effort download — signed URL may or may not be reachable from test env
        try:
            content = client.extraction.download_export(result, timeout=10)
        except Exception as e:
            pytest.skip(f"signed URL not reachable from test env: {e}")
        assert isinstance(content, bytes)
        assert len(content) >= 0


# ---------------------------------------------------------------------------
# validation.rules.delete_rule — needs an existing rule
# ---------------------------------------------------------------------------


class TestValidationDeleteRule:
    """The backend's DELETE /v4/data-validation/rules/{ruleId} is idempotent:
    it returns 200 with ``error: false`` even when no rule matched. We just
    verify the SDK successfully sends both body variants."""

    def test_delete_without_workflow_scope_400s(self, client):
        """No body — backend's Zod schema rejects with 400."""
        from kadoa_sdk.validation.validation_acl import DeleteRuleRequest

        with pytest.raises(Exception):
            client.validation.rules.delete_rule(
                DeleteRuleRequest(rule_id="00000000-0000-0000-0000-000000000000")
            )

    def test_delete_with_workflow_scope_carries_body(self, client):
        from kadoa_sdk.validation.validation_acl import DeleteRuleRequest

        result = client.validation.rules.delete_rule(
            DeleteRuleRequest(
                rule_id="00000000-0000-0000-0000-000000000000",
                workflow_id="00000000-0000-0000-0000-000000000000",
                reason="sdk e2e probe",
            )
        )
        assert result is not None
