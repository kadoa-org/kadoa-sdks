"""Crawler domain exports.

Public boundary for crawler management functionality.
"""

# ACL types
from .crawler_acl import (
    # API Client
    CrawlerApi,
    CrawlerApiInterface,
    # Enums
    PageStatus,
    # Config request types
    ArtifactOptions,
    BlueprintItem,
    CrawlMethod,
    CreateConfigRequest,
    DeleteConfigRequest,
    ExtractionOptions,
    NavigationOptions,
    # Session request types
    StartCrawlRequest,
    StartWithConfigRequest,
    # Config response types
    CrawlerConfig,
    DeleteConfigResult,
    # Session response types
    CrawlerSession,
    ListSessionsResult,
    PageContent,
    PaginationInfo,
    SessionDataItem,
    SessionDataList,
    SessionOperationResult,
    SessionPage,
    SessionPagesResult,
    SessionStatus,
    StartSessionResult,
    # Service options
    GetAllDataOptions,
    GetBucketFileOptions,
    GetPageOptions,
    GetPagesOptions,
    ListSessionsOptions,
)

# Services
from .crawler_config_service import CrawlerConfigService
from .crawler_session_service import CrawlerSessionService

__all__ = [
    # Services
    "CrawlerConfigService",
    "CrawlerSessionService",
    # API Client
    "CrawlerApi",
    "CrawlerApiInterface",
    # Enums
    "PageStatus",
    # Config request types
    "ArtifactOptions",
    "BlueprintItem",
    "CrawlMethod",
    "CreateConfigRequest",
    "DeleteConfigRequest",
    "ExtractionOptions",
    "NavigationOptions",
    # Session request types
    "StartCrawlRequest",
    "StartWithConfigRequest",
    # Config response types
    "CrawlerConfig",
    "DeleteConfigResult",
    # Session response types
    "CrawlerSession",
    "ListSessionsResult",
    "PageContent",
    "PaginationInfo",
    "SessionDataItem",
    "SessionDataList",
    "SessionOperationResult",
    "SessionPage",
    "SessionPagesResult",
    "SessionStatus",
    "StartSessionResult",
    # Service options
    "GetAllDataOptions",
    "GetBucketFileOptions",
    "GetPageOptions",
    "GetPagesOptions",
    "ListSessionsOptions",
]
