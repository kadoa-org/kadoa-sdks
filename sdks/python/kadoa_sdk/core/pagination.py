from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Callable, Generic, List, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PageInfo(BaseModel):
    """Simple page-based pagination info"""

    total_count: Optional[int] = None
    page: Optional[int] = None
    total_pages: Optional[int] = None
    limit: Optional[int] = None


class PagedResponse(BaseModel, Generic[T]):
    """Paginated response with data and pagination info"""

    data: List[T]
    pagination: PageInfo


class PageOptions(BaseModel):
    """Options for paginated requests"""

    page: Optional[int] = None
    limit: Optional[int] = None


class PagedIterator(Generic[T]):
    """Simple paginator for page-based pagination"""

    def __init__(
        self,
        fetch_page: Callable[[PageOptions], PagedResponse[T]],
    ) -> None:
        self._fetch_page = fetch_page

    def fetch_all(self, options: Optional[PageOptions] = None) -> List[T]:
        """Fetch all items across all pages"""
        if options is None:
            options = PageOptions()

        all_items: List[T] = []
        current_page = 1
        has_more = True

        while has_more:
            result = self._fetch_page(PageOptions(page=current_page, limit=options.limit))
            all_items.extend(result.data)

            pagination = result.pagination
            has_more = (
                pagination.page is not None
                and pagination.total_pages is not None
                and pagination.page < pagination.total_pages
            )

            current_page += 1

        return all_items

    async def pages(
        self, options: Optional[PageOptions] = None
    ) -> AsyncGenerator[PagedResponse[T], None]:
        """Async generator for paginated pages"""
        if options is None:
            options = PageOptions()

        current_page = 1
        has_more = True

        while has_more:
            result = self._fetch_page(PageOptions(page=current_page, limit=options.limit))
            yield result

            pagination = result.pagination
            has_more = (
                pagination.page is not None
                and pagination.total_pages is not None
                and pagination.page < pagination.total_pages
            )

            current_page += 1

    async def items(self, options: Optional[PageOptions] = None) -> AsyncGenerator[T, None]:
        """Async generator for individual items across all pages"""
        async for page in self.pages(options):
            for item in page.data:
                yield item
