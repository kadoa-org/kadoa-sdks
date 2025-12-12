"""Crawler domain ACL.

Wraps generated CrawlerApi requests/responses and normalizes types.
Downstream code must import from this module instead of `openapi_client/**`.
"""

from typing import Literal, TypedDict, Union

# ============================================================================
# IMPORTS
# ============================================================================

# API Client
from openapi_client.api.crawler_api import CrawlerApi

# Nested config types
from openapi_client.models.create_crawler_config_request_artifact_options import (
    CreateCrawlerConfigRequestArtifactOptions,
)
from openapi_client.models.create_crawler_config_request_blueprint_inner import (
    CreateCrawlerConfigRequestBlueprintInner,
)
from openapi_client.models.create_crawler_config_request_crawl_method import (
    CreateCrawlerConfigRequestCrawlMethod,
)
from openapi_client.models.create_crawler_config_request_extraction_options import (
    CreateCrawlerConfigRequestExtractionOptions,
)
from openapi_client.models.create_crawler_config_request_navigation_options import (
    CreateCrawlerConfigRequestNavigationOptions,
)

# Response types
from openapi_client.models.create_crawler_config_response import CreateCrawlerConfigResponse
from openapi_client.models.delete_crawler_config_response import DeleteCrawlerConfigResponse
from openapi_client.models.get_crawler_config_response import GetCrawlerConfigResponse
from openapi_client.models.get_crawler_session_data_list_response import (
    GetCrawlerSessionDataListResponse,
)
from openapi_client.models.get_crawler_session_data_list_response_data_inner import (
    GetCrawlerSessionDataListResponseDataInner,
)
from openapi_client.models.get_crawler_session_page_response import GetCrawlerSessionPageResponse
from openapi_client.models.get_crawler_session_pages_response import GetCrawlerSessionPagesResponse
from openapi_client.models.get_crawler_session_pages_response_pagination import (
    GetCrawlerSessionPagesResponsePagination,
)
from openapi_client.models.get_crawler_session_pages_response_payload_inner import (
    GetCrawlerSessionPagesResponsePayloadInner,
)
from openapi_client.models.get_crawler_session_status_response import (
    GetCrawlerSessionStatusResponse,
)
from openapi_client.models.list_crawler_sessions_response import ListCrawlerSessionsResponse
from openapi_client.models.pause_crawler_session_response import PauseCrawlerSessionResponse
from openapi_client.models.resume_crawler_session_response import ResumeCrawlerSessionResponse
from openapi_client.models.start_crawler_session_response import StartCrawlerSessionResponse

# Request types
from openapi_client.models.create_crawler_config_request import CreateCrawlerConfigRequest
from openapi_client.models.delete_crawler_config_request import DeleteCrawlerConfigRequest
from openapi_client.models.pause_crawler_session_request import PauseCrawlerSessionRequest
from openapi_client.models.resume_crawler_session_request import ResumeCrawlerSessionRequest
from openapi_client.models.start_crawler_session_request import StartCrawlerSessionRequest
from openapi_client.models.start_session_with_config_request import StartSessionWithConfigRequest

# Session item
from openapi_client.models.crawler_session_item import CrawlerSessionItem

# ============================================================================
# API CLIENT
# ============================================================================

CrawlerApiInterface = CrawlerApi

# ============================================================================
# ENUMS
# ============================================================================

PageStatus = Literal["DONE", "CRAWLING", "PENDING"]

# ============================================================================
# CONFIG REQUEST TYPES
# ============================================================================

CreateConfigRequest = CreateCrawlerConfigRequest
DeleteConfigRequest = DeleteCrawlerConfigRequest

# Nested config options (re-export with cleaner names)
ArtifactOptions = CreateCrawlerConfigRequestArtifactOptions
BlueprintItem = CreateCrawlerConfigRequestBlueprintInner
CrawlMethod = CreateCrawlerConfigRequestCrawlMethod
ExtractionOptions = CreateCrawlerConfigRequestExtractionOptions
NavigationOptions = CreateCrawlerConfigRequestNavigationOptions

# ============================================================================
# SESSION REQUEST TYPES
# ============================================================================

StartCrawlRequest = StartCrawlerSessionRequest
StartWithConfigRequest = StartSessionWithConfigRequest
PauseSessionRequest = PauseCrawlerSessionRequest
ResumeSessionRequest = ResumeCrawlerSessionRequest

# ============================================================================
# CONFIG RESPONSE TYPES
# ============================================================================

# Unify create/get config responses (same shape)
CrawlerConfig = Union[CreateCrawlerConfigResponse, GetCrawlerConfigResponse]
DeleteConfigResult = DeleteCrawlerConfigResponse

# ============================================================================
# SESSION RESPONSE TYPES
# ============================================================================

StartSessionResult = StartCrawlerSessionResponse
SessionOperationResult = Union[PauseCrawlerSessionResponse, ResumeCrawlerSessionResponse]
SessionStatus = GetCrawlerSessionStatusResponse

# Session list types
CrawlerSession = CrawlerSessionItem
ListSessionsResult = ListCrawlerSessionsResponse

# Pages types
SessionPage = GetCrawlerSessionPagesResponsePayloadInner
PaginationInfo = GetCrawlerSessionPagesResponsePagination
SessionPagesResult = GetCrawlerSessionPagesResponse
PageContent = GetCrawlerSessionPageResponse

# Session data types
SessionDataItem = GetCrawlerSessionDataListResponseDataInner
SessionDataList = GetCrawlerSessionDataListResponse

# ============================================================================
# SERVICE REQUEST OPTIONS
# ============================================================================


class ListSessionsOptions(TypedDict, total=False):
    page: int
    page_size: int
    user_id: str


class GetPagesOptions(TypedDict, total=False):
    current_page: int
    page_size: int


class GetPageOptions(TypedDict, total=False):
    format: Literal["html", "markdown"]


class GetAllDataOptions(TypedDict, total=False):
    include_all: bool


class GetBucketFileOptions(TypedDict, total=False):
    content_type: str
    cache_control: str


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    # API Client
    "CrawlerApi",
    "CrawlerApiInterface",
    # Enums
    "PageStatus",
    # Config request types
    "CreateConfigRequest",
    "DeleteConfigRequest",
    "ArtifactOptions",
    "BlueprintItem",
    "CrawlMethod",
    "ExtractionOptions",
    "NavigationOptions",
    # Session request types
    "StartCrawlRequest",
    "StartWithConfigRequest",
    "PauseSessionRequest",
    "ResumeSessionRequest",
    # Config response types
    "CrawlerConfig",
    "DeleteConfigResult",
    # Session response types
    "StartSessionResult",
    "SessionOperationResult",
    "SessionStatus",
    "CrawlerSession",
    "ListSessionsResult",
    "SessionPage",
    "PaginationInfo",
    "SessionPagesResult",
    "PageContent",
    "SessionDataItem",
    "SessionDataList",
    # Service options
    "ListSessionsOptions",
    "GetPagesOptions",
    "GetPageOptions",
    "GetAllDataOptions",
    "GetBucketFileOptions",
]
