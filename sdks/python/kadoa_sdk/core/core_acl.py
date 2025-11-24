"""Core domain ACL.

Wraps generated core types (ApiClient, Configuration, ApiException, RESTClientObject).
Downstream code must import from this module instead of `openapi_client/**`.
"""

from openapi_client import ApiClient, Configuration
from openapi_client.exceptions import ApiException
from openapi_client.rest import RESTClientObject

from ..version import SDK_LANGUAGE, SDK_NAME, __version__

__all__ = [
    "ApiClient",
    "Configuration",
    "ApiException",
    "RESTClientObject",
    "create_api_client",
]


def create_api_client(configuration: Configuration) -> ApiClient:
    """Create an ApiClient instance with proper SDK headers.

    Args:
        configuration: The configuration to use for the ApiClient

    Returns:
        ApiClient instance with User-Agent, X-SDK-Version, and X-SDK-Language headers set
    """
    api_client = ApiClient(configuration)
    api_client.user_agent = f"{SDK_NAME}/{__version__}"
    api_client.default_headers["X-SDK-Version"] = __version__
    api_client.default_headers["X-SDK-Language"] = SDK_LANGUAGE
    return api_client
