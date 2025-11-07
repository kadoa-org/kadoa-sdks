from __future__ import annotations

import weakref
from typing import TYPE_CHECKING

from ..notifications.notifications_acl import NotificationsApi
from .core_acl import ApiClient

if TYPE_CHECKING:  # pragma: no cover
    from ..client import KadoaClient
    from ..extraction.extraction_acl import CrawlApi, WorkflowsApi
    from ..schemas.schemas_acl import SchemasApi
    from ..validation.validation_acl import DataValidationApi

# Use WeakKeyDictionary to automatically clean up when clients are garbage collected
_crawl_cache: weakref.WeakKeyDictionary["KadoaClient", "CrawlApi"] = weakref.WeakKeyDictionary()
_workflows_cache: weakref.WeakKeyDictionary["KadoaClient", "WorkflowsApi"] = (
    weakref.WeakKeyDictionary()
)
_notifications_cache: weakref.WeakKeyDictionary["KadoaClient", NotificationsApi] = (
    weakref.WeakKeyDictionary()
)
_schemas_cache: weakref.WeakKeyDictionary["KadoaClient", "SchemasApi"] = weakref.WeakKeyDictionary()
_validation_cache: weakref.WeakKeyDictionary["KadoaClient", "DataValidationApi"] = (
    weakref.WeakKeyDictionary()
)


def get_crawl_api(client: "KadoaClient") -> "CrawlApi":
    from ..extraction.extraction_acl import CrawlApi  # noqa: PLC0415

    api = _crawl_cache.get(client)
    if api is None:
        api = CrawlApi(ApiClient(client.configuration))
        _crawl_cache[client] = api
    return api


def get_workflows_api(client: "KadoaClient") -> "WorkflowsApi":
    from ..extraction.extraction_acl import WorkflowsApi  # noqa: PLC0415

    api = _workflows_cache.get(client)
    if api is None:
        api = WorkflowsApi(ApiClient(client.configuration))
        _workflows_cache[client] = api
    return api


def get_notifications_api(client: "KadoaClient") -> NotificationsApi:
    api = _notifications_cache.get(client)
    if api is None:
        api = NotificationsApi(ApiClient(client.configuration))
        _notifications_cache[client] = api
    return api


def get_schemas_api(client: "KadoaClient") -> "SchemasApi":
    from ..schemas.schemas_acl import SchemasApi  # noqa: PLC0415

    api = _schemas_cache.get(client)
    if api is None:
        api = SchemasApi(ApiClient(client.configuration))
        _schemas_cache[client] = api
    return api


def get_validation_api(client: "KadoaClient") -> "DataValidationApi":
    from ..validation.validation_acl import DataValidationApi  # noqa: PLC0415

    api = _validation_cache.get(client)
    if api is None:
        api = DataValidationApi(ApiClient(client.configuration))
        _validation_cache[client] = api
    return api
