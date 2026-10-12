"""Unit tests for client.data_quality at the HTTP boundary."""

import json
from typing import Any, Dict, List

import pytest

import kadoa_sdk.client.client as client_module
from kadoa_sdk import KadoaClient, KadoaClientConfig, KadoaHttpError

EDITED = {"editedBy": "user", "editedAt": "2026-09-22T10:00:00Z"}
RULES = {
    "title": {
        "kind": "STRING",
        "presence": {"target": 100, **EDITED},
        "format": {"kind": "FORMAT", "source": {"kind": "PRESET", "preset": "url"}, **EDITED},
    },
    "publishedAt": {
        "kind": "DATE",
        "maximum": {"kind": "RELATIVE", "preset": "TODAY", **EDITED},
    },
}


class FakeResponse:
    def __init__(self, status: int, payload: Dict[str, Any]) -> None:
        self.status = status
        self._raw = json.dumps(payload).encode()

    def read(self) -> bytes:
        return self._raw


@pytest.fixture
def transport(monkeypatch):
    """Capture every request the client sends and answer from a queue."""
    sent: List[Dict[str, Any]] = []
    replies: List[FakeResponse] = []

    class FakeRest:
        def __init__(self, _configuration) -> None:
            pass

        def request(self, method, url, headers=None, body=None, **_kwargs):
            sent.append({"method": method, "url": url, "body": body})
            return replies.pop(0)

    monkeypatch.setattr(client_module, "RESTClientObject", FakeRest)
    monkeypatch.setattr(client_module, "check_for_updates", lambda: None)
    client = KadoaClient(KadoaClientConfig(api_key="tk-test", base_url="https://api.test"))
    yield client, sent, replies
    client.dispose()


@pytest.mark.unit
def test_get_rules_returns_rules_keyed_by_field(transport):
    client, sent, replies = transport
    replies.append(FakeResponse(200, {"rules": RULES}))

    assert client.data_quality.get_rules("wf-1") == RULES
    assert sent == [
        {
            "method": "GET",
            "url": "https://api.test/v4/workflows/wf-1/schema-validation-rules",
            "body": None,
        }
    ]


@pytest.mark.unit
def test_get_rules_returns_none_without_rules(transport):
    client, _sent, replies = transport
    replies.append(FakeResponse(200, {"rules": None}))

    assert client.data_quality.get_rules("wf-1") is None


@pytest.mark.unit
def test_upsert_rules_sends_edited_at_unchanged(transport):
    """The API only accepts UTC timestamps ending in Z, so the body must not be re-serialized."""
    client, sent, replies = transport
    merged = {**RULES, "price": {"kind": "OTHER"}}
    replies.append(FakeResponse(200, {"rules": merged}))

    assert client.data_quality.upsert_rules("wf-1", RULES) == merged
    assert sent[0]["method"] == "PUT"
    assert sent[0]["body"] == RULES
    assert sent[0]["body"]["title"]["presence"]["editedAt"] == "2026-09-22T10:00:00Z"


@pytest.mark.unit
def test_delete_field_rules_encodes_the_field_name(transport):
    client, sent, replies = transport
    replies.append(FakeResponse(200, {"rules": {}}))

    assert client.data_quality.delete_field_rules("wf-1", "price/usd") == {}
    assert sent[0]["method"] == "DELETE"
    assert sent[0]["url"] == (
        "https://api.test/v4/workflows/wf-1/schema-validation-rules/price%2Fusd"
    )


@pytest.mark.unit
def test_api_errors_raise_kadoa_http_error_with_details(transport):
    client, _sent, replies = transport
    replies.append(
        FakeResponse(409, {"error": "Template-linked", "code": "TEMPLATE_CONTROLLED_FIELD"})
    )

    with pytest.raises(KadoaHttpError) as excinfo:
        client.data_quality.upsert_rules("wf-1", RULES)

    assert excinfo.value.http_status == 409
    assert excinfo.value.response_body["code"] == "TEMPLATE_CONTROLLED_FIELD"
