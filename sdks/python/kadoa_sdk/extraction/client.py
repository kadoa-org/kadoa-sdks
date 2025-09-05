"""
API client helper functions for Kadoa SDK.
"""

from typing import TYPE_CHECKING
from weakref import WeakKeyDictionary

from openapi_client import ApiClient, CrawlApi, WorkflowsApi

if TYPE_CHECKING:
    from kadoa_sdk.kadoa_sdk import KadoaSdk


_crawl_api_cache: WeakKeyDictionary["KadoaSdk", CrawlApi] = WeakKeyDictionary()
_workflows_api_cache: WeakKeyDictionary["KadoaSdk", WorkflowsApi] = WeakKeyDictionary()


def get_crawl_api(sdk: "KadoaSdk") -> CrawlApi:
    """
    Get or create a CrawlApi instance for the given sdk.

    Uses WeakKeyDictionary to cache instances, preventing memory leaks.

    Args:
        sdk: The KadoaSdk instance

    Returns:
        CrawlApi instance
    """
    if sdk not in _crawl_api_cache:
        api_client = ApiClient(configuration=sdk.configuration)
        _crawl_api_cache[sdk] = CrawlApi(api_client)

    return _crawl_api_cache[sdk]


def get_workflows_api(sdk: "KadoaSdk") -> WorkflowsApi:
    """
    Get or create a WorkflowsApi instance for the given sdk.

    Uses WeakKeyDictionary to cache instances, preventing memory leaks.

    Args:
        sdk: The KadoaSdk instance

    Returns:
        WorkflowsApi instance
    """
    if sdk not in _workflows_api_cache:
        api_client = ApiClient(configuration=sdk.configuration)
        _workflows_api_cache[sdk] = WorkflowsApi(api_client)

    return _workflows_api_cache[sdk]
