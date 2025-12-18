"""PY-WEBHOOKS: data-delivery/webhooks.mdx snippets"""

import pytest
from kadoa_sdk.notifications import SetupWorkflowNotificationSettingsRequest, ListSettingsRequest
from tests.utils.cleanup_helpers import delete_channel_by_name


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


class TestWebhooksSnippets:

    @pytest.mark.e2e
    def test_webhooks_001_quick_setup(self, client, workflow_id):
        """PY-WEBHOOKS-001: Quick webhook setup"""
        if not workflow_id:
            raise ValueError("Workflow ID is required")

        channel_name = "api-integration"
        delete_channel_by_name(client, channel_name)
        clear_settings(client, workflow_id)

        # @docs-start PY-WEBHOOKS-001
        client.notification.setup_for_workflow(
            SetupWorkflowNotificationSettingsRequest(
                workflow_id=workflow_id,
                events=["workflow_data_change"],
                channels={
                    "WEBHOOK": {
                        "name": "api-integration",
                        "webhookUrl": "https://api.example.com/webhooks/kadoa",
                        "httpMethod": "POST",
                    }
                },
            )
        )
        # @docs-end PY-WEBHOOKS-001

        assert True

        # Cleanup
        delete_channel_by_name(client, channel_name)

    @pytest.mark.e2e
    def test_webhooks_002_channel_management(self, client):
        """PY-WEBHOOKS-002: Channel management"""
        channel_name = "my-webhook"
        delete_channel_by_name(client, channel_name)

        # @docs-start PY-WEBHOOKS-002
        # Create webhook channel
        channel = client.notification.channels.create_channel(
            "WEBHOOK",
            name="my-webhook",
            config={
                "webhookUrl": "https://sandbox.kadoa.com/api/webhooks/kadoa",
                "httpMethod": "POST",
            },
        )

        # List all channels
        channels = client.notification.channels.list_channels()

        print("Created channel:", channel)
        print("All channels:", channels)
        # @docs-end PY-WEBHOOKS-002

        assert channel is not None
        assert channels is not None

        # Cleanup
        if channel.id:
            client.notification.channels.delete_channel(channel.id)
