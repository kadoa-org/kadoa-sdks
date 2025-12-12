"""Service for managing crawler sessions."""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from ..client import KadoaClient

from .crawler_acl import (
    CrawlerApi,
    CrawlerSession,
    GetAllDataOptions,
    GetPageOptions,
    GetPagesOptions,
    ListSessionsOptions,
    PageContent,
    PauseSessionRequest,
    ResumeSessionRequest,
    SessionDataList,
    SessionOperationResult,
    SessionPagesResult,
    SessionStatus,
    StartCrawlRequest,
    StartSessionResult,
    StartWithConfigRequest,
)


class CrawlerSessionService:
    """Service for managing crawler sessions."""

    def __init__(self, client: "KadoaClient") -> None:
        self._client = client
        self._crawler_api: Optional[CrawlerApi] = None

    @property
    def crawler_api(self) -> CrawlerApi:
        """Get or create the crawler API client."""
        if self._crawler_api is None:
            from ..core.core_acl import create_api_client

            self._crawler_api = CrawlerApi(create_api_client(self._client.configuration))
        return self._crawler_api

    def start(self, body: StartCrawlRequest) -> StartSessionResult:
        """Start a new crawler session.

        Args:
            body: Start session request body

        Returns:
            Started session result
        """
        return self.crawler_api.v4_crawl_post(start_crawler_session_request=body)

    def start_with_config(self, body: StartWithConfigRequest) -> StartSessionResult:
        """Start a crawler session with an existing configuration.

        Args:
            body: Start with config request body

        Returns:
            Started session result
        """
        return self.crawler_api.v4_crawl_start_post(start_session_with_config_request=body)

    def pause(self, session_id: str) -> SessionOperationResult:
        """Pause a crawler session.

        Args:
            session_id: Session ID

        Returns:
            Session operation result
        """
        return self.crawler_api.v4_crawl_pause_post(
            pause_crawler_session_request=PauseSessionRequest(session_id=session_id)
        )

    def resume(self, session_id: str) -> SessionOperationResult:
        """Resume a paused crawler session.

        Args:
            session_id: Session ID

        Returns:
            Session operation result
        """
        return self.crawler_api.v4_crawl_resume_post(
            resume_crawler_session_request=ResumeSessionRequest(session_id=session_id)
        )

    def list_sessions(
        self, options: Optional[ListSessionsOptions] = None
    ) -> list[CrawlerSession]:
        """List crawler sessions.

        Args:
            options: List options (pagination, filters)

        Returns:
            List of crawler sessions
        """
        opts = options or {}
        response = self.crawler_api.v4_crawl_sessions_get(
            page=opts.get("page"),
            page_size=opts.get("page_size"),
            user_id=opts.get("user_id"),
        )
        return response.data or []

    def get_session_status(self, session_id: str) -> SessionStatus:
        """Get status of a crawler session.

        Args:
            session_id: Session ID

        Returns:
            Session status
        """
        return self.crawler_api.v4_crawl_session_id_status_get(session_id=session_id)

    def get_pages(
        self, session_id: str, options: Optional[GetPagesOptions] = None
    ) -> SessionPagesResult:
        """Get pages from a crawler session.

        Args:
            session_id: Session ID
            options: Pagination options

        Returns:
            Session pages result
        """
        opts = options or {}
        return self.crawler_api.v4_crawl_session_id_pages_get(
            session_id=session_id,
            current_page=opts.get("current_page"),
            page_size=opts.get("page_size"),
        )

    def get_page(
        self, session_id: str, page_id: str, options: Optional[GetPageOptions] = None
    ) -> PageContent:
        """Get a specific page from a crawler session.

        Args:
            session_id: Session ID
            page_id: Page ID
            options: Page options (format)

        Returns:
            Page content
        """
        opts = options or {}
        return self.crawler_api.v4_crawl_session_id_pages_page_id_get(
            session_id=session_id,
            page_id=page_id,
            format=opts.get("format"),
        )

    def get_all_session_data(
        self, session_id: str, options: Optional[GetAllDataOptions] = None
    ) -> SessionDataList:
        """Get all data from a crawler session.

        Args:
            session_id: Session ID
            options: Data options

        Returns:
            Session data list
        """
        opts = options or {}
        return self.crawler_api.v4_crawl_session_id_list_get(
            session_id=session_id,
            include_all=opts.get("include_all"),
        )

    def get_bucket_file(self, filenameb64: str) -> object:
        """Get a file from the crawling bucket.

        Args:
            filenameb64: Base64 encoded filename

        Returns:
            File content
        """
        return self.crawler_api.v4_crawl_bucket_data_filenameb64_get(
            filenameb64=filenameb64
        )
