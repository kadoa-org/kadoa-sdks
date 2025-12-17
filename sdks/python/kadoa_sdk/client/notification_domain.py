from __future__ import annotations

from typing import TYPE_CHECKING, List, cast

from openapi_client.models.v5_notifications_test_post_request import (
    V5NotificationsTestPostRequest,
)

from ..core.exceptions import KadoaErrorCode, KadoaHttpError, KadoaSdkError
from ..notifications import NotificationOptions, NotificationSettingsEventType
from .models import TestNotificationRequest, TestNotificationResult

if TYPE_CHECKING:  # pragma: no cover
    from ..notifications import NotificationChannelsService, NotificationSettingsService, NotificationSetupService
    from ..notifications.notifications_acl import NotificationsApi, NotificationSettings
    from ..notifications.notification_setup_service import (
        SetupWorkflowNotificationSettingsRequest,
        SetupWorkspaceNotificationSettingsRequest,
    )


class NotificationDomain:
    """Notification domain providing access to channels, settings, and setup services"""

    def __init__(
        self,
        notifications_api: "NotificationsApi",
        channels: "NotificationChannelsService",
        settings: "NotificationSettingsService",
        setup: "NotificationSetupService",
    ) -> None:
        self._api = notifications_api
        self.channels = channels
        self.settings = settings
        self.setup = setup

    def configure(self, options: NotificationOptions) -> List["NotificationSettings"]:
        """Configure notifications (convenience method)."""

        return self.setup.setup(options)

    def setup_for_workflow(
        self, request: "SetupWorkflowNotificationSettingsRequest"
    ) -> List["NotificationSettings"]:
        """Setup notifications for a specific workflow."""

        return self.setup.setup_for_workflow(request)

    def setup_for_workspace(
        self, request: "SetupWorkspaceNotificationSettingsRequest"
    ) -> List["NotificationSettings"]:
        """Setup notifications for the workspace."""

        return self.setup.setup_for_workspace(request)

    def test_notification(self, request: TestNotificationRequest) -> TestNotificationResult:
        """Trigger a test notification event."""

        try:
            response = self._api.v5_notifications_test_post(
                V5NotificationsTestPostRequest(
                    eventType=request.event_type,
                    workflowId=request.workflow_id,
                )
            )
        except Exception as error:
            raise KadoaHttpError.wrap(error, message="Failed to test notification")

        data = response.data
        if not data or not data.event_id or not data.event_type:
            raise KadoaSdkError(
                "Failed to test notification",
                code=KadoaErrorCode.INTERNAL_ERROR,
                details={
                    "response": response.to_dict()
                    if hasattr(response, "to_dict")
                    else str(response),
                },
            )

        event_type = cast(NotificationSettingsEventType, data.event_type)
        return TestNotificationResult(
            event_id=data.event_id,
            event_type=event_type,
            workflow_id=data.workflow_id,
        )


