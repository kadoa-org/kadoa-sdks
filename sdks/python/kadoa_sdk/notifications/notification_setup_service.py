"""Notification setup service for convenient notification configuration"""

from __future__ import annotations

from typing import TYPE_CHECKING, Literal, Optional, Union

if TYPE_CHECKING:  # pragma: no cover
    pass

from ..core.exceptions import KadoaErrorCode, KadoaSdkError
from ..core.logger import notifications as logger
from .notification_channels_service import NotificationChannelsService
from .notification_settings_service import NotificationSettingsService
from .notifications_acl import (
    ChannelConfig,
    NotificationChannel,
    NotificationChannelType,
    NotificationSettings,
    NotificationSettingsEventType,
)

debug = logger

# Type definitions matching Node.js
ChannelSetupRequestConfig = ChannelConfig

NotificationSetupRequestChannels = dict[
    str,
    Union[
        bool,
        dict[str, str],  # { channelId: string }
        dict[str, Union[str, ChannelConfig]],  # Config with name
    ],
]


class NotificationOptions:
    """Options for notification setup"""

    def __init__(
        self,
        workflow_id: Optional[str] = None,
        events: Optional[Union[list[NotificationSettingsEventType], Literal["all"]]] = None,
        channels: Optional[NotificationSetupRequestChannels] = None,
    ) -> None:
        self.workflow_id = workflow_id
        self.events = events
        self.channels = channels


class SetupWorkspaceNotificationSettingsRequest:
    """Request to setup workspace-level notification settings"""

    def __init__(
        self,
        events: Union[list[NotificationSettingsEventType], Literal["all"]],
        channels: NotificationSetupRequestChannels,
    ) -> None:
        self.events = events
        self.channels = channels


class SetupWorkflowNotificationSettingsRequest(SetupWorkspaceNotificationSettingsRequest):
    """Request to setup workflow-level notification settings"""

    def __init__(
        self,
        workflow_id: str,
        events: Union[list[NotificationSettingsEventType], Literal["all"]],
        channels: NotificationSetupRequestChannels,
    ) -> None:
        super().__init__(events, channels)
        self.workflow_id = workflow_id


class NotificationSetupService:
    """Service for convenient notification setup"""

    def __init__(
        self,
        channels_service: NotificationChannelsService,
        settings_service: NotificationSettingsService,
    ) -> None:
        self._channels_service = channels_service
        self._settings_service = settings_service

    def setup_for_workflow(
        self, request_data: SetupWorkflowNotificationSettingsRequest
    ) -> list[NotificationSettings]:
        """Setup notification settings for a specific workflow ensuring no duplicates exist

        Args:
            request_data: Workflow notification setup configuration

        Returns:
            Array of created notification settings

        Raises:
            KadoaSdkError: If settings already exist
        """
        from .notifications_acl import ListSettingsRequest

        existing_settings = self._settings_service.list_settings(
            ListSettingsRequest(workflow_id=request_data.workflow_id)
        )
        if existing_settings:
            raise KadoaSdkError(
                "Settings already exist",
                code=KadoaErrorCode.BAD_REQUEST,
                details={"workflow_id": request_data.workflow_id},
            )

        return self.setup(
            NotificationOptions(
                workflow_id=request_data.workflow_id,
                events=request_data.events,
                channels=request_data.channels,
            )
        )

    def setup_for_workspace(
        self, request_data: SetupWorkspaceNotificationSettingsRequest
    ) -> list[NotificationSettings]:
        """Setup notification settings at the workspace level ensuring no duplicates exist

        Args:
            request_data: Workspace notification setup configuration

        Returns:
            Array of created notification settings

        Raises:
            KadoaSdkError: If settings already exist
        """
        from .notifications_acl import ListSettingsRequest

        existing_settings = self._settings_service.list_settings(ListSettingsRequest())
        if existing_settings:
            raise KadoaSdkError(
                "Workspace settings already exist",
                code=KadoaErrorCode.BAD_REQUEST,
            )

        return self.setup(
            NotificationOptions(
                events=request_data.events,
                channels=request_data.channels,
            )
        )

    def setup(self, request_data: NotificationOptions) -> list[NotificationSettings]:
        """Complete workflow notification setup including channels and settings

        Args:
            request_data: Workflow notification setup configuration

        Returns:
            Array of created notification settings
        """
        if request_data.workflow_id:
            debug.debug("Setting up notifications for workflow %s", request_data.workflow_id)
        else:
            debug.debug("Setting up notifications for workspace")

        channels = self.setup_channels(
            workflow_id=request_data.workflow_id,
            channels=request_data.channels or {},
        )

        events = request_data.events or "all"
        event_types = self._settings_service.list_all_events() if events == "all" else events

        channel_ids = [ch.id for ch in channels if ch.id]

        debug.debug(
            "Creating notification settings for workflow %s: %s",
            request_data.workflow_id,
            {"events": event_types, "channels": channel_ids},
        )

        from .notifications_acl import CreateSettingsRequest

        new_settings = []
        for event_type in event_types:
            setting = self._settings_service.create_settings(
                CreateSettingsRequest(
                    workflow_id=request_data.workflow_id,
                    channel_ids=channel_ids,
                    event_type=event_type,
                    enabled=True,
                    event_configuration={},
                )
            )
            new_settings.append(setting)

        debug.debug(
            "Successfully setup notifications for workflow %s"
            if request_data.workflow_id
            else "Successfully setup notifications for workspace",
            request_data.workflow_id,
        )
        return new_settings

    def setup_channels(
        self,
        workflow_id: Optional[str],
        channels: NotificationSetupRequestChannels,
    ) -> list[NotificationChannel]:
        """Setup channels from request configuration

        Args:
            workflow_id: Optional workflow ID
            channels: Channel configuration

        Returns:
            List of notification channels
        """
        # List all channels (both workflow-specific and workspace-level)
        existing_channels = self._channels_service.list_all_channels(workflow_id)

        # Separate channels by type
        channels_by_name: list[tuple[NotificationChannelType, bool]] = []
        channels_by_id: list[tuple[NotificationChannelType, dict[str, str]]] = []
        channels_by_config: list[tuple[NotificationChannelType, ChannelSetupRequestConfig]] = []

        for channel_type_str, value in channels.items():
            channel_type = channel_type_str  # type: ignore
            if value is True:
                channels_by_name.append((channel_type, True))
            elif isinstance(value, dict):
                if "channelId" in value:
                    channels_by_id.append((channel_type, value))  # type: ignore
                else:
                    channels_by_config.append((channel_type, value))  # type: ignore

        channels_by_id_result = self._handle_channels_by_id(
            channels_by_id, existing_channels, workflow_id
        )
        default_channels_result = self._handle_default_channels(
            channels_by_name, existing_channels, workflow_id
        )
        channels_by_config_result = self._handle_channels_by_config(
            channels_by_config, existing_channels, workflow_id
        )

        return [
            *channels_by_id_result,
            *default_channels_result,
            *channels_by_config_result,
        ]

    def _handle_channels_by_id(
        self,
        channels_by_id: list[tuple[NotificationChannelType, dict[str, str]]],
        existing_channels: list[NotificationChannel],
        workflow_id: Optional[str],
    ) -> list[NotificationChannel]:
        """Handle channels specified by ID"""
        requested_channel_ids = [value["channelId"] for _, value in channels_by_id]
        result_channels = [ch for ch in existing_channels if ch.id in requested_channel_ids]

        found_channel_ids = [ch.id for ch in result_channels if ch.id]
        missing_channel_ids = [
            ch_id for ch_id in requested_channel_ids if ch_id not in found_channel_ids
        ]

        if missing_channel_ids:
            raise KadoaSdkError(
                f"Channels not found: {', '.join(missing_channel_ids)}",
                code=KadoaErrorCode.NOT_FOUND,
                details={"workflow_id": workflow_id, "missing_channel_ids": missing_channel_ids},
            )

        return result_channels

    def _handle_default_channels(
        self,
        channels_by_name: list[tuple[NotificationChannelType, bool]],
        existing_channels: list[NotificationChannel],
        workflow_id: Optional[str],
    ) -> list[NotificationChannel]:
        """Handle default channels (created with True value)"""
        result_channels = []
        for channel_type, _ in channels_by_name:
            # For WebSocket channels, check if there's already ANY WebSocket channel
            # since the API only allows one WebSocket channel per workspace
            existing_channel = None
            if channel_type == "WEBSOCKET":
                existing_channel = next(
                    (ch for ch in existing_channels if ch.channel_type == channel_type),
                    None,
                )
            else:
                existing_channel = next(
                    (
                        ch
                        for ch in existing_channels
                        if ch.channel_type == channel_type
                        and ch.name == NotificationChannelsService.DEFAULT_CHANNEL_NAME
                    ),
                    None,
                )

            if existing_channel:
                debug.debug(
                    "Using existing default channel: %s",
                    {
                        "workflow_id": workflow_id,
                        "channel_type": channel_type,
                        "channel_id": existing_channel.id,
                    },
                )
                result_channels.append(existing_channel)
            else:
                # Channel doesn't exist, create it
                channel = self._channels_service.create_channel(channel_type)
                debug.debug(
                    "Created default channel %s",
                    {
                        "workflow_id": workflow_id,
                        "channel_type": channel_type,
                        "channel": channel,
                    },
                )
                result_channels.append(channel)

        return result_channels

    def _handle_channels_by_config(
        self,
        channels_by_config: list[tuple[NotificationChannelType, ChannelSetupRequestConfig]],
        existing_channels: list[NotificationChannel],
        workflow_id: Optional[str],
    ) -> list[NotificationChannel]:
        """Handle channels specified by configuration"""
        if not channels_by_config:
            return []

        result_channels = []
        for channel_type, config in channels_by_config:
            channel_name = (
                config.get("name")
                if isinstance(config, dict)
                else getattr(config, "name", NotificationChannelsService.DEFAULT_CHANNEL_NAME)
            )
            if isinstance(channel_name, str):
                name = channel_name
            else:
                name = NotificationChannelsService.DEFAULT_CHANNEL_NAME

            existing_channel = next(
                (
                    ch
                    for ch in existing_channels
                    if ch.channel_type == channel_type
                    and (ch.name or NotificationChannelsService.DEFAULT_CHANNEL_NAME) == name
                ),
                None,
            )

            if existing_channel:
                debug.debug(
                    "Using existing channel: %s",
                    {
                        "workflow_id": workflow_id,
                        "channel_type": channel_type,
                        "channel_name": name,
                        "channel_id": existing_channel.id,
                    },
                )
                result_channels.append(existing_channel)
            else:
                # Extract config without name for channel creation
                if isinstance(config, dict):
                    channel_config = {k: v for k, v in config.items() if k != "name"}
                else:
                    channel_config = config

                channel = self._channels_service.create_channel(
                    channel_type,
                    name=name,
                    config=channel_config,  # type: ignore
                )
                debug.debug(
                    "Created channel with custom config %s",
                    {
                        "workflow_id": workflow_id,
                        "channel_type": channel_type,
                        "channel_name": name,
                        "channel": channel,
                    },
                )
                result_channels.append(channel)

        return result_channels
