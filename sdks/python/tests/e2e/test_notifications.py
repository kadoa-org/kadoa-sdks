"""
E2E tests for notifications functionality matching Node.js structure.
"""

import pytest
import pytest_asyncio

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.extraction.types import ExtractOptions
from kadoa_sdk.notifications import (
    ListSettingsRequest,
    NotificationOptions,
    SetupWorkflowNotificationSettingsRequest,
    SetupWorkspaceNotificationSettingsRequest,
)
from tests.utils.seeder import seed_workflow


@pytest.mark.e2e
class TestNotifications:
    """E2E tests for notifications functionality."""

    @pytest_asyncio.fixture(scope="class")
    async def client(self):
        """Initialize client for all tests in this class."""
        settings = get_settings()
        client = KadoaClient(
            KadoaClientConfig(
                api_key=settings.api_key,
                timeout=30,
            )
        )

        yield client

        client.dispose()

    @pytest_asyncio.fixture(scope="class")
    async def workflow_id(self, client):
        """Create a test workflow for notification tests."""
        result = seed_workflow("test-workflow-notifications", client)
        yield result["workflow_id"]

    @pytest.fixture(autouse=True)
    def cleanup_test_data(self, client):
        """Clean up test data before and after each test."""
        # Cleanup before test
        self._cleanup_test_data(client)
        yield
        # Cleanup after test
        self._cleanup_test_data(client)

    def _cleanup_test_data(self, client):
        """Helper to clean up notification settings and channels."""
        try:
            # Clean up settings
            settings = client.notification.settings.list_settings({})
            for setting in settings:
                if setting.id:
                    try:
                        client.notification.settings.delete_settings(setting.id)
                    except Exception:
                        pass  # Ignore errors during cleanup

            # Clean up channels - handle deserialization errors gracefully
            try:
                channels = client.notification.channels.list_all_channels()
                for channel in channels:
                    if channel.id:
                        try:
                            client.notification.channels.delete_channel(channel.id)
                        except Exception:
                            pass  # Ignore errors during cleanup
            except (ValueError, Exception):
                # If list_all_channels fails due to deserialization errors,
                # try to delete channels by ID if we can get them from raw API
                # For now, just log and continue - the fallback in list_channels
                # should handle this, but if it still fails, we'll skip cleanup
                pass  # Ignore deserialization errors during cleanup
        except Exception:
            pass  # Ignore errors during cleanup

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_setup_notifications_for_workspace(self, client):
        """Should setup notifications for workspace."""
        result = client.notification.setup_for_workspace(
            SetupWorkspaceNotificationSettingsRequest(
                events="all",
                channels={
                    "EMAIL": True,
                    "WEBSOCKET": True,
                },
            )
        )

        assert result is not None
        assert isinstance(result, list)
        assert len(result) > 0
        assert result[0].workflow_id is None  # Workspace-level settings
        assert result[0].channels is not None
        assert len(result[0].channels) == 2
        assert result[0].enabled is True

        # Check that we have EMAIL and WEBSOCKET channels
        channel_types = [ch.channel_type for ch in result[0].channels]
        assert "EMAIL" in channel_types
        assert "WEBSOCKET" in channel_types

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_setup_notifications_for_workflow(self, client, workflow_id):
        """Should setup notifications for specific workflow."""
        result = client.notification.setup_for_workflow(
            SetupWorkflowNotificationSettingsRequest(
                workflow_id=workflow_id,
                events=["workflow_finished", "workflow_failed"],
                channels={
                    "WEBSOCKET": True,
                    "EMAIL": True,
                },
            )
        )

        assert result is not None
        assert isinstance(result, list)
        assert len(result) > 0
        assert result[0].workflow_id == workflow_id
        assert result[0].channels is not None
        assert len(result[0].channels) == 2

        # Check that we have the expected event types
        event_types = [setting.event_type for setting in result]
        assert "workflow_finished" in event_types
        assert "workflow_failed" in event_types

        # Check that we have WEBSOCKET and EMAIL channels
        channel_types = [ch.channel_type for ch in result[0].channels]
        assert "WEBSOCKET" in channel_types
        assert "EMAIL" in channel_types

        assert result[0].enabled is True

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_list_channels(self, client):
        """Should list notification channels."""
        # Create a channel first
        channel = client.notification.channels.create_channel("EMAIL")

        # List channels
        channels = client.notification.channels.list_channels()

        assert channels is not None
        assert isinstance(channels, list)
        assert len(channels) > 0

        # Verify our channel is in the list
        channel_ids = [ch.id for ch in channels if ch.id]
        assert channel.id in channel_ids

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_create_and_delete_channel(self, client):
        """Should create and delete a notification channel."""
        # Create channel
        channel = client.notification.channels.create_channel("EMAIL")

        assert channel is not None
        assert channel.id is not None
        assert channel.channel_type == "EMAIL"

        # Delete channel
        client.notification.channels.delete_channel(channel.id)

        # Verify it's deleted by trying to list channels
        channels = client.notification.channels.list_channels()
        channel_ids = [ch.id for ch in channels if ch.id]
        assert channel.id not in channel_ids

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_list_settings(self, client, workflow_id):
        """Should list notification settings."""
        # Create settings first
        client.notification.setup_for_workflow(
            SetupWorkflowNotificationSettingsRequest(
                workflow_id=workflow_id,
                events=["workflow_finished"],
                channels={"EMAIL": True},
            )
        )

        # List settings
        settings = client.notification.settings.list_settings(
            ListSettingsRequest(workflow_id=workflow_id)
        )

        assert settings is not None
        assert isinstance(settings, list)
        assert len(settings) > 0
        assert settings[0].workflow_id == workflow_id

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_list_all_events(self, client):
        """Should list all available notification event types."""
        events = client.notification.settings.list_all_events()

        assert events is not None
        assert isinstance(events, list)
        assert len(events) > 0

        # Check for some expected event types
        assert "workflow_started" in events
        assert "workflow_finished" in events
        assert "workflow_failed" in events

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_notifications_in_extraction_builder(self, client):
        """Should configure notifications during extraction."""
        extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/careers"],
                    name="Extraction with Notifications Test",
                )
            )
            .with_notifications(
                NotificationOptions(
                    events="all",
                    channels={
                        "EMAIL": True,
                        "WEBSOCKET": True,
                    },
                )
            )
            .bypass_preview()
            .create()
        )

        assert extraction is not None
        assert extraction.workflow_id is not None

        # Verify notifications were set up
        settings = client.notification.settings.list_settings(
            ListSettingsRequest(workflow_id=extraction.workflow_id)
        )
        assert len(settings) > 0
