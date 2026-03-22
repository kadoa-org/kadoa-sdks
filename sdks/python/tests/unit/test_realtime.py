import asyncio
import importlib.util
import json
import sys
import types
from pathlib import Path
from types import SimpleNamespace

import pytest

MODULE_PATH = Path(__file__).resolve().parents[2] / "kadoa_sdk" / "core" / "realtime.py"

if "kadoa_sdk" not in sys.modules:
    kadoa_sdk_pkg = types.ModuleType("kadoa_sdk")
    kadoa_sdk_pkg.__path__ = [str(MODULE_PATH.parents[1])]
    sys.modules["kadoa_sdk"] = kadoa_sdk_pkg

if "kadoa_sdk.core" not in sys.modules:
    core_pkg = types.ModuleType("kadoa_sdk.core")
    core_pkg.__path__ = [str(MODULE_PATH.parent)]
    sys.modules["kadoa_sdk.core"] = core_pkg

if "kadoa_sdk.core.logger" not in sys.modules:
    logger_module = types.ModuleType("kadoa_sdk.core.logger")
    logger_module.wss = SimpleNamespace(debug=lambda *args, **kwargs: None)
    sys.modules["kadoa_sdk.core.logger"] = logger_module

if "kadoa_sdk.core.settings" not in sys.modules:
    settings_module = types.ModuleType("kadoa_sdk.core.settings")
    settings_module.get_settings = lambda: SimpleNamespace()
    sys.modules["kadoa_sdk.core.settings"] = settings_module

if "kadoa_sdk.version" not in sys.modules:
    version_module = types.ModuleType("kadoa_sdk.version")
    version_module.__version__ = "test-version"
    sys.modules["kadoa_sdk.version"] = version_module

module_spec = importlib.util.spec_from_file_location("kadoa_sdk.core.realtime", MODULE_PATH)
assert module_spec is not None and module_spec.loader is not None
realtime_module = importlib.util.module_from_spec(module_spec)
sys.modules["kadoa_sdk.core.realtime"] = realtime_module
module_spec.loader.exec_module(realtime_module)

Realtime = realtime_module.Realtime
RealtimeConfig = realtime_module.RealtimeConfig


class FakeConnectionClosedError(Exception):
    pass


class FakeWebSocket:
    def __init__(self, uri: str) -> None:
        self.uri = uri
        self.sent: list[str] = []
        self.close_code: int | None = None
        self._messages: asyncio.Queue[str | Exception] = asyncio.Queue()

    async def send(self, payload: str) -> None:
        self.sent.append(payload)

    async def recv(self) -> str:
        message = await self._messages.get()
        if isinstance(message, Exception):
            raise message
        return message

    async def close(self) -> None:
        if self.close_code is not None:
            return
        self.close_code = 1001
        self._messages.put_nowait(FakeConnectionClosedError())

    def queue_message(self, payload: dict) -> None:
        self._messages.put_nowait(json.dumps(payload))


async def wait_for_socket(created: list[FakeWebSocket], index: int) -> FakeWebSocket:
    for _ in range(50):
        if len(created) > index:
            return created[index]
        await asyncio.sleep(0.001)
    raise AssertionError(f"Timed out waiting for socket {index}")


@pytest.mark.unit
class TestRealtime:
    @pytest.mark.asyncio
    async def test_reconnects_on_drain_with_last_cursor_and_dedupes_overlap(self, monkeypatch):
        created: list[FakeWebSocket] = []
        acknowledged_ids: list[str] = []

        async def fake_connect(uri: str) -> FakeWebSocket:
            socket = FakeWebSocket(uri)
            created.append(socket)
            return socket

        token_counter = {"value": 0}

        async def fake_get_oauth_token(self) -> tuple[str, str]:
            token_counter["value"] += 1
            return f"token-{token_counter['value']}", "team-123"

        async def fake_ack(self, event_id: str) -> None:
            acknowledged_ids.append(event_id)

        monkeypatch.setattr(realtime_module.websockets, "connect", fake_connect)
        monkeypatch.setattr(
            realtime_module.websockets.exceptions,
            "ConnectionClosed",
            FakeConnectionClosedError,
        )
        monkeypatch.setattr(
            realtime_module,
            "get_settings",
            lambda: SimpleNamespace(
                wss_api_uri="ws://example.test/realtime",
                realtime_api_uri="http://example.test/realtime",
                public_api_uri="http://example.test/public",
            ),
        )
        monkeypatch.setattr(Realtime, "_get_oauth_token", fake_get_oauth_token)
        monkeypatch.setattr(Realtime, "_acknowledge_event", fake_ack)

        realtime = Realtime(
            RealtimeConfig(
                api_key="test-key",
                reconnect_delay=2,
                heartbeat_interval=50,
                missed_heartbeats_limit=5000,
            )
        )

        connection_states: list[tuple[bool, str | None]] = []
        events: list[dict] = []

        realtime.on_connection(
            lambda connected, reason=None: connection_states.append((connected, reason))
        )
        realtime.on_event(lambda event: events.append(event))

        await realtime.connect()

        first_socket = await wait_for_socket(created, 0)
        assert json.loads(first_socket.sent[0]) == {
            "action": "subscribe",
            "channel": "team-123",
        }

        first_socket.queue_message(
            {
                "type": "workflow.updated",
                "id": "event-1",
                "_cursor": "cursor-1",
                "timestamp": 1,
                "message": {"status": "running"},
            }
        )
        await asyncio.sleep(0.01)

        first_socket.queue_message({"type": "control.draining", "retryAfterMs": 1})
        second_socket = await wait_for_socket(created, 1)
        await asyncio.sleep(0.01)

        assert json.loads(second_socket.sent[0]) == {
            "action": "subscribe",
            "channel": "team-123",
            "lastCursor": "cursor-1",
        }

        first_socket.queue_message(
            {
                "type": "workflow.updated",
                "id": "event-1",
                "_cursor": "cursor-1",
                "timestamp": 1,
                "message": {"status": "running"},
            }
        )
        second_socket.queue_message(
            {
                "type": "workflow.updated",
                "id": "event-1",
                "_cursor": "cursor-1",
                "timestamp": 1,
                "message": {"status": "running"},
            }
        )
        second_socket.queue_message(
            {
                "type": "workflow.updated",
                "id": "event-2",
                "_cursor": "cursor-2",
                "timestamp": 2,
                "message": {"status": "done"},
            }
        )
        await asyncio.sleep(0.01)

        await first_socket.close()
        await asyncio.sleep(0.01)

        assert [event["id"] for event in events] == ["event-1", "event-2"]
        assert connection_states == [(True, None)]
        assert acknowledged_ids == ["event-1", "event-1", "event-1", "event-2"]

        await realtime.close_async()

    @pytest.mark.asyncio
    async def test_emits_disconnect_and_reconnects_after_unexpected_close(self, monkeypatch):
        created: list[FakeWebSocket] = []

        async def fake_connect(uri: str) -> FakeWebSocket:
            socket = FakeWebSocket(uri)
            created.append(socket)
            return socket

        token_counter = {"value": 0}

        async def fake_get_oauth_token(self) -> tuple[str, str]:
            token_counter["value"] += 1
            return f"token-{token_counter['value']}", "team-123"

        monkeypatch.setattr(realtime_module.websockets, "connect", fake_connect)
        monkeypatch.setattr(
            realtime_module.websockets.exceptions,
            "ConnectionClosed",
            FakeConnectionClosedError,
        )
        monkeypatch.setattr(
            realtime_module,
            "get_settings",
            lambda: SimpleNamespace(
                wss_api_uri="ws://example.test/realtime",
                realtime_api_uri="http://example.test/realtime",
                public_api_uri="http://example.test/public",
            ),
        )
        monkeypatch.setattr(Realtime, "_get_oauth_token", fake_get_oauth_token)

        realtime = Realtime(
            RealtimeConfig(
                api_key="test-key",
                reconnect_delay=2,
                heartbeat_interval=50,
                missed_heartbeats_limit=5000,
            )
        )

        connection_states: list[tuple[bool, str | None]] = []
        realtime.on_connection(
            lambda connected, reason=None: connection_states.append((connected, reason))
        )

        await realtime.connect()
        first_socket = await wait_for_socket(created, 0)

        await first_socket.close()
        second_socket = await wait_for_socket(created, 1)
        assert second_socket is not None
        await asyncio.sleep(0.01)

        assert connection_states == [
            (True, None),
            (False, "Connection closed"),
            (True, None),
        ]

        await realtime.close_async()
