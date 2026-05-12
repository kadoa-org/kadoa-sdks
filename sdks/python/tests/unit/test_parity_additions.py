"""Unit tests for parity additions from KAD-7030.

Covers: extraction.export_data, templates, variables, changes,
workflows.get_audit_log, validation.delete_rule.
"""

from datetime import datetime
from unittest.mock import Mock

import pytest

import kadoa_sdk.changes.changes_service as ch_mod
import kadoa_sdk.extraction.services.data_fetcher_service as df_mod
import kadoa_sdk.templates.templates_service as tpl_mod
import kadoa_sdk.variables.variables_service as var_mod
from kadoa_sdk.changes import ChangesService, ListChangesOptions
from kadoa_sdk.extraction import ExportDataOptions, ExtractionModule
from kadoa_sdk.templates import TemplatesService
from kadoa_sdk.validation.validation_acl import DeleteRuleRequest
from kadoa_sdk.variables import VariablesService


# ---------------------------------------------------------------------------
# extraction.export_data
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_extraction_export_data_returns_signed_url(monkeypatch):
    client = Mock()
    module = ExtractionModule(client)

    mock_api = Mock()
    mock_api.v4_workflows_workflow_id_data_export_get.return_value = Mock(
        workflow_id="wf-1",
        run_id="run-1",
        executed_at=datetime(2026, 1, 1, 0, 0, 0),
        format="csv",
        row_count=42,
        url="https://signed.example.com/export.csv?sig=abc",
        expires_at=datetime(2026, 1, 2, 0, 0, 0),
    )
    # data_fetcher uses get_workflows_api imported into its module

    monkeypatch.setattr(df_mod, "get_workflows_api", lambda _c: mock_api)

    result = module.export_data(
        ExportDataOptions(workflow_id="wf-1", format="csv", run_id="run-1")
    )

    mock_api.v4_workflows_workflow_id_data_export_get.assert_called_once_with(
        workflow_id="wf-1",
        format="csv",
        run_id="run-1",
        filters=None,
        sort_by=None,
        order=None,
        row_ids=None,
    )
    assert result.workflow_id == "wf-1"
    assert result.run_id == "run-1"
    assert result.row_count == 42
    assert result.url.startswith("https://signed.example.com/")
    # datetimes should be normalized to ISO strings
    assert result.executed_at == "2026-01-01T00:00:00"
    assert result.expires_at == "2026-01-02T00:00:00"


# ---------------------------------------------------------------------------
# templates
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_templates_list_unwraps_data(monkeypatch):
    client = Mock()
    svc = TemplatesService(client)
    mock_api = Mock()
    mock_api.v4_templates_get.return_value = Mock(data=["t1", "t2"])

    monkeypatch.setattr(tpl_mod, "get_templates_api", lambda _c: mock_api)
    assert svc.list() == ["t1", "t2"]


@pytest.mark.unit
def test_templates_get_raises_when_missing(monkeypatch):
    client = Mock()
    svc = TemplatesService(client)
    mock_api = Mock()
    mock_api.v4_templates_template_id_get.return_value = Mock(data=None)

    monkeypatch.setattr(tpl_mod, "get_templates_api", lambda _c: mock_api)

    from kadoa_sdk.core.exceptions import KadoaSdkError

    with pytest.raises(KadoaSdkError):
        svc.get("missing")


# ---------------------------------------------------------------------------
# variables
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_variables_list_unwraps_variables(monkeypatch):
    client = Mock()
    svc = VariablesService(client)
    mock_api = Mock()
    mock_api.v4_variables_get.return_value = Mock(variables=["v1"])

    monkeypatch.setattr(var_mod, "get_variables_api", lambda _c: mock_api)
    assert svc.list() == ["v1"]


@pytest.mark.unit
def test_variables_delete_calls_endpoint(monkeypatch):
    client = Mock()
    svc = VariablesService(client)
    mock_api = Mock()

    monkeypatch.setattr(var_mod, "get_variables_api", lambda _c: mock_api)
    svc.delete("var-1")
    # Uses no-preload variant to skip strict response deserialization
    mock_api.v4_variables_variable_id_delete_without_preload_content.assert_called_once_with(
        variable_id="var-1"
    )


# ---------------------------------------------------------------------------
# changes
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_changes_list_maps_response(monkeypatch):
    client = Mock()
    svc = ChangesService(client)
    mock_api = Mock()
    raw_change = Mock(
        id="c1",
        workflow_id="wf-1",
        data=[{"a": 1}],
        differences=None,
        url="https://example.com",
        summary="x",
        screenshot_url="https://s",
        created_at=datetime(2026, 1, 1),
    )
    mock_api.v4_changes_get.return_value = Mock(
        changes=[raw_change],
        pagination={"total": 1},
        changes_count=1,
    )

    monkeypatch.setattr(ch_mod, "get_workflows_api", lambda _c: mock_api)

    result = svc.list(ListChangesOptions(limit=10))
    assert result.changes_count == 1
    assert result.changes[0].id == "c1"
    assert result.changes[0].created_at == "2026-01-01T00:00:00"


@pytest.mark.unit
def test_changes_coalesce_pairs_added_removed_same_row():
    """An added+removed sharing rowRef should coalesce into one 'changed' diff."""
    added = Mock(
        type="added",
        fields=[Mock(key="name", value="new", previous_value=None)],
        row_ref=Mock(current_row_id="row-1", previous_row_id=None),
    )
    removed = Mock(
        type="removed",
        fields=[Mock(key="name", value="old", previous_value=None)],
        row_ref=Mock(current_row_id=None, previous_row_id="row-1"),
    )
    result = ch_mod._coalesce_differences([added, removed])
    assert result is not None
    assert len(result) == 1
    assert result[0].type == "changed"
    assert result[0].fields is not None
    assert result[0].fields[0].key == "name"
    assert result[0].fields[0].value == "new"
    assert result[0].fields[0].previous_value == "old"


# ---------------------------------------------------------------------------
# validation.delete_rule
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_validation_delete_rule_sends_reason_body(monkeypatch):
    from kadoa_sdk.validation.validation_rules_service import ValidationRulesService

    client = Mock()
    svc = ValidationRulesService(client)

    mock_api = Mock()
    monkeypatch.setattr(
        ValidationRulesService,
        "validation_api",
        property(lambda self: mock_api),
    )

    svc.delete_rule(DeleteRuleRequest(rule_id="r1", workflow_id="wf-1", reason="cleanup"))

    mock_api.v4_data_validation_rules_rule_id_delete.assert_called_once()
    kwargs = mock_api.v4_data_validation_rules_rule_id_delete.call_args.kwargs
    assert kwargs["rule_id"] == "r1"
    assert kwargs["delete_rule_with_reason"] is not None


@pytest.mark.unit
def test_validation_delete_rule_no_body_when_no_workflow(monkeypatch):
    from kadoa_sdk.validation.validation_rules_service import ValidationRulesService

    client = Mock()
    svc = ValidationRulesService(client)
    mock_api = Mock()
    monkeypatch.setattr(
        ValidationRulesService,
        "validation_api",
        property(lambda self: mock_api),
    )

    svc.delete_rule(DeleteRuleRequest(rule_id="r1"))

    kwargs = mock_api.v4_data_validation_rules_rule_id_delete.call_args.kwargs
    assert kwargs["delete_rule_with_reason"] is None


# ---------------------------------------------------------------------------
# workflows.get_audit_log
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_workflows_get_audit_log_passes_paging(monkeypatch):
    from kadoa_sdk.workflows.workflows_core_service import WorkflowsCoreService

    client = Mock()
    svc = WorkflowsCoreService(client)
    mock_api = Mock()
    mock_api.v5_workflows_workflow_id_auditlog_get.return_value = Mock(entries=[])
    monkeypatch.setattr(
        WorkflowsCoreService,
        "workflows_api",
        property(lambda self: mock_api),
    )

    svc.get_audit_log("wf-1", page=2, limit=50)

    mock_api.v5_workflows_workflow_id_auditlog_get.assert_called_once_with(
        workflow_id="wf-1", page=2, limit=50
    )
