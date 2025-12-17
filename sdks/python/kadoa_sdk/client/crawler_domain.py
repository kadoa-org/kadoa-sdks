from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover
    from ..crawler import CrawlerConfigService, CrawlerSessionService


class CrawlerDomain:
    """Crawler domain providing access to config and session services"""

    def __init__(
        self,
        config: "CrawlerConfigService",
        session: "CrawlerSessionService",
    ) -> None:
        self.config = config
        self.session = session
