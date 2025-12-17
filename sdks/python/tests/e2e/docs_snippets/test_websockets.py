"""PY-WEBSOCKETS: data-delivery/websockets.mdx snippets"""

import pytest
from kadoa_sdk import KadoaClient, KadoaClientConfig


class TestWebsocketsSnippets:

    @pytest.mark.e2e
    @pytest.mark.asyncio
    async def test_websockets_001_realtime_updates(self, api_key):
        """PY-WEBSOCKETS-001: WebSocket real-time updates"""
        # @docs-start PY-WEBSOCKETS-001
        client = KadoaClient(config=KadoaClientConfig(api_key=api_key))
        realtime = await client.connect_realtime()

        realtime.on_event(lambda event: print("Event:", event))

        realtime.on_connection(lambda connected, reason=None: print("Connection status:", connected))

        realtime.on_error(lambda error: print("Realtime connection error:", error))
        # @docs-end PY-WEBSOCKETS-001

        assert client.realtime is not None
        assert client.is_realtime_connected() is True

        realtime.close()
        client.disconnect_realtime()
        client.dispose()
