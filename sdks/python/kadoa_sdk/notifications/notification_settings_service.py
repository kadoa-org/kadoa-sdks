"""Notification settings service for managing notification settings"""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:  # pragma: no cover
    pass

from ..core.exceptions import KadoaHttpError
from .notifications_acl import (
    CreateSettingsRequest,
    ListSettingsRequest,
    NotificationsApi,
    NotificationSettings,
    NotificationSettingsEventType,
    NotificationSettingsEventTypeEnum,
    V5NotificationsSettingsPostRequest,
)


class NotificationSettingsService:
    """Service for managing notification settings"""

    def __init__(self, notifications_api: NotificationsApi) -> None:
        self._api = notifications_api

    def create_settings(self, request_data: CreateSettingsRequest) -> NotificationSettings:
        """Create notification settings

        Args:
            request_data: Settings creation request

        Returns:
            Created notification settings

        Raises:
            KadoaHttpError: If API request fails
        """

        request = V5NotificationsSettingsPostRequest(**request_data.model_dump(by_alias=True))

        try:
            response = self._api.v5_notifications_settings_post(
                v5_notifications_settings_post_request=request
            )

            if not response.data or not response.data.settings:
                raise KadoaHttpError.wrap(
                    Exception("No settings in response"),
                    message="Failed to create notification settings",
                )

            return response.data.settings
        except Exception as error:
            if isinstance(error, KadoaHttpError):
                raise
            raise KadoaHttpError.wrap(
                error,
                message="Failed to create notification settings",
            )

    def list_settings(
        self, filters: Optional[ListSettingsRequest] = None
    ) -> list[NotificationSettings]:
        """List notification settings

        Args:
            filters: Optional filters for listing settings

        Returns:
            List of notification settings

        Raises:
            KadoaHttpError: If API request fails
        """
        request_params = {}
        if filters:
            if filters.workflow_id:
                request_params["workflow_id"] = filters.workflow_id
            if filters.event_type:
                request_params["event_type"] = filters.event_type

        try:
            response = self._api.v5_notifications_settings_get(**request_params)

            if not response.data:
                return []

            settings = response.data.settings
            if settings is None:
                return []

            return settings
        except Exception as error:
            if isinstance(error, KadoaHttpError):
                raise
            raise KadoaHttpError.wrap(
                error,
                message="Failed to list notification settings",
            )

    def list_all_events(self) -> list[NotificationSettingsEventType]:
        """List all available notification event types

        Returns:
            List of event type strings
        """
        return list(NotificationSettingsEventTypeEnum)

    def delete_settings(self, settings_id: str) -> None:
        """Delete notification settings

        Args:
            settings_id: ID of the settings to delete

        Raises:
            KadoaHttpError: If API request fails
        """
        try:
            self._api.v5_notifications_settings_settings_id_delete(settings_id=settings_id)
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to delete notification settings",
            )
