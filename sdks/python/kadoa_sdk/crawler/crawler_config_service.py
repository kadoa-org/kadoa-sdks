"""Service for managing crawler configurations."""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from ..client import KadoaClient

from .crawler_acl import (
    CrawlerApi,
    CrawlerConfig,
    CreateConfigRequest,
    DeleteConfigRequest,
    DeleteConfigResult,
)


class CrawlerConfigService:
    """Service for managing crawler configurations."""

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

    def create_config(self, body: CreateConfigRequest) -> CrawlerConfig:
        """Create a new crawler configuration."""
        return self.crawler_api.v4_crawl_config_post(
            create_crawler_config_request=body,
        )

    def get_config(self, config_id: str) -> CrawlerConfig:
        """Get a crawler configuration by ID."""
        return self.crawler_api.v4_crawl_config_config_id_get(config_id=config_id)

    def delete_config(self, config_id: str) -> DeleteConfigResult:
        """Delete a crawler configuration."""
        return self.crawler_api.v4_crawl_config_delete(
            delete_crawler_config_request=DeleteConfigRequest(config_id=config_id),
        )
