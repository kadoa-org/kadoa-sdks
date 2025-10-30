from __future__ import annotations

from typing import TYPE_CHECKING, Dict

from openapi_client import ApiClient

try:  # pragma: no cover - compatibility shim for generator rename
    from openapi_client.api.crawler_api import CrawlerApi as CrawlApi  # type: ignore[attr-defined]
except ImportError:  # pragma: no cover
    from openapi_client.api.crawl_api import CrawlApi  # type: ignore[attr-defined]

from openapi_client.api.workflows_api import WorkflowsApi

if TYPE_CHECKING:  # pragma: no cover
    from ..client import KadoaClient

_crawl_cache: Dict[int, CrawlApi] = {}
_workflows_cache: Dict[int, WorkflowsApi] = {}


def get_crawl_api(client: "KadoaClient") -> CrawlApi:
    key = id(client)
    api = _crawl_cache.get(key)
    if api is None:
        api = CrawlApi(ApiClient(client.configuration))
        _crawl_cache[key] = api
    return api


def get_workflows_api(client: "KadoaClient") -> WorkflowsApi:
    key = id(client)
    api = _workflows_cache.get(key)
    if api is None:
        api = WorkflowsApi(ApiClient(client.configuration))
        _workflows_cache[key] = api
    return api
