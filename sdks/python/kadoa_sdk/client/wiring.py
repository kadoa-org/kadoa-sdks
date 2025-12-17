from __future__ import annotations

from typing import TYPE_CHECKING

from ..core.http import get_notifications_api
from ..notifications import (
    NotificationChannelsService,
    NotificationSettingsService,
    NotificationSetupService,
)
from ..user import UserService
from ..validation import ValidationCoreService, ValidationDomain, ValidationRulesService
from .notification_domain import NotificationDomain

if TYPE_CHECKING:  # pragma: no cover
    from .client import KadoaClient


def create_notification_domain(client: "KadoaClient") -> NotificationDomain:
    notifications_api = get_notifications_api(client)

    user_service = UserService(client)
    channels_service = NotificationChannelsService(notifications_api, user_service)
    settings_service = NotificationSettingsService(notifications_api)
    setup_service = NotificationSetupService(channels_service, settings_service)

    return NotificationDomain(
        notifications_api=notifications_api,
        channels=channels_service,
        settings=settings_service,
        setup=setup_service,
    )


def create_validation_domain(client: "KadoaClient") -> ValidationDomain:
    core_service = ValidationCoreService(client)
    rules_service = ValidationRulesService(client)
    return ValidationDomain(core=core_service, rules=rules_service)


