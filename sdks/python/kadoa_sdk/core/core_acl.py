"""Core domain ACL.

Wraps generated core types (ApiClient, Configuration, ApiException, RESTClientObject).
Downstream code must import from this module instead of `openapi_client/**`.
"""

from openapi_client import ApiClient, Configuration
from openapi_client.exceptions import ApiException
from openapi_client.rest import RESTClientObject

__all__ = [
    "ApiClient",
    "Configuration",
    "ApiException",
    "RESTClientObject",
]
