"""PY-NOTIFICATIONS: notifications.mdx snippets"""

import pytest
from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.notifications import SetupWorkflowNotificationSettingsRequest, ListSettingsRequest
from .conftest import delete_channel_by_name


def clear_settings(client, workflow_id: str) -> None:
    """Clear settings before each example."""
    existing = client.notification.settings.list_settings(
        ListSettingsRequest(workflow_id=workflow_id)
    )
    for setting in existing:
        setting_id = getattr(setting, "id", None)
        if setting_id:
            try:
                client.notification.settings.delete_settings(setting_id)
            except Exception:
                pass


class TestNotificationsSnippets:

    @pytest.mark.e2e
    def test_notifications_001_setup_workflow(self, client, fixture_workflow_id):
        """PY-NOTIFICATIONS-001: Setup workflow notifications"""
        if not fixture_workflow_id:
            raise ValueError("Workflow ID is required")

        # Clean env before test
        clear_settings(client, fixture_workflow_id)
        delete_channel_by_name(client, "team-notifications")
        delete_channel_by_name(client, "api-integration")

        # @docs-start PY-NOTIFICATIONS-001
        # Email notifications
        client.notification.setup_for_workflow(
            SetupWorkflowNotificationSettingsRequest(
                workflow_id=fixture_workflow_id,
                events=["workflow_finished", "workflow_failed"],
                channels={"EMAIL": True},
            )
        )
        # @docs-end PY-NOTIFICATIONS-001

        # Clear for next example
        clear_settings(client, fixture_workflow_id)

        # Custom email recipients
        client.notification.setup_for_workflow(
            SetupWorkflowNotificationSettingsRequest(
                workflow_id=fixture_workflow_id,
                events=["workflow_finished"],
                channels={
                    "EMAIL": {
                        "name": "team-notifications",
                        "recipients": ["team@example.com"],
                    }
                },
            )
        )

        clear_settings(client, fixture_workflow_id)

        # Slack notifications
        client.notification.setup_for_workflow(
            SetupWorkflowNotificationSettingsRequest(
                workflow_id=fixture_workflow_id,
                events=["workflow_failed"],
                channels={
                    "SLACK": {
                        "name": "team-notifications",
                        "slackChannelId": "C1234567890",
                        "slackChannelName": "alerts",
                        "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK",
                    }
                },
            )
        )

        clear_settings(client, fixture_workflow_id)

        # Webhook notifications
        client.notification.setup_for_workflow(
            SetupWorkflowNotificationSettingsRequest(
                workflow_id=fixture_workflow_id,
                events=["workflow_finished"],
                channels={
                    "WEBHOOK": {
                        "name": "api-integration",
                        "webhookUrl": "https://api.example.com/webhooks/kadoa",
                        "httpMethod": "POST",
                    }
                },
            )
        )

        assert True

        # Cleanup
        clear_settings(client, fixture_workflow_id)
        delete_channel_by_name(client, "team-notifications")
        delete_channel_by_name(client, "api-integration")

    @pytest.mark.e2e
    @pytest.mark.asyncio
    async def test_notifications_002_realtime_websocket(self, api_key):
        """PY-NOTIFICATIONS-002: Real-time WebSocket"""
        # @docs-start PY-NOTIFICATIONS-002
        client = KadoaClient(config=KadoaClientConfig(api_key=api_key))
        realtime = await client.connect_realtime()

        # Subscribe to all events
        realtime.on_event(lambda event: print("Event received:", event["type"], event["message"]))

        # Filter events by type
        def handle_filtered(event):
            if event["type"] == "workflow_finished":
                print("Workflow completed:", event["message"])

        realtime.on_event(handle_filtered)

        # Handle errors
        realtime.on_error(lambda error: print("WebSocket error:", error))
        # @docs-end PY-NOTIFICATIONS-002

        assert client.realtime is not None
        assert client.is_realtime_connected() is True

        realtime.close()
        client.disconnect_realtime()
        client.dispose()

    @pytest.mark.e2e
    def test_notifications_003_channel_management(self, client):
        """PY-NOTIFICATIONS-003: Channel management"""
        # @docs-start PY-NOTIFICATIONS-003
        # List channels
        channels = client.notification.channels.list_channels()

        print("Channels:", channels)
        # @docs-end PY-NOTIFICATIONS-003

        assert channels is not None

