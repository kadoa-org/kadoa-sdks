from __future__ import annotations

from collections.abc import AsyncGenerator
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List

from ..extraction_acl import V4WorkflowsWorkflowIdDataGet200Response

if TYPE_CHECKING:  # pragma: no cover
    from ...client import KadoaClient
from ...core.exceptions import KadoaHttpError, KadoaSdkError
from ...core.http import get_workflows_api
from ...core.pagination import PagedIterator, PageInfo, PageOptions, PagedResponse
from ..types import FetchDataOptions, FetchDataResult


class DataFetcherService:
    """Service for fetching extracted data from workflows.

    Provides methods to retrieve paginated data from completed workflows,
    with support for filtering, sorting, and pagination.

    Args:
        client: The KadoaClient instance for API access
    """

    def __init__(self, client: "KadoaClient") -> None:
        self.client = client
        self._default_limit = 100

    def fetch_workflow_data(self, workflow_id: str, limit: int) -> List[Dict[str, Any]]:
        """Legacy method for backward compatibility"""
        api = get_workflows_api(self.client)
        try:
            resp = api.v4_workflows_workflow_id_data_get(workflow_id=workflow_id, limit=limit)

            container: Any = getattr(resp, "data", resp)
            if isinstance(container, list):
                data_list: List[Dict[str, Any]] = container
                return data_list
            inner: Any = getattr(container, "data", None)
            if isinstance(inner, list):
                inner_list: List[Dict[str, Any]] = inner
                return inner_list
            if isinstance(container, dict) and isinstance(container.get("data"), list):
                data: List[Dict[str, Any]] = container["data"]
                return data
            return []
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message=KadoaSdkError.ERROR_MESSAGES["DATA_FETCH_FAILED"],
                details={"workflowId": workflow_id, "limit": limit},
            )

    def fetch_data(self, options: FetchDataOptions) -> FetchDataResult:
        """Fetch a page of workflow data with pagination support.

        Retrieves a single page of extracted data from a workflow with
        support for filtering, sorting, and pagination.

        Args:
            options: Fetch data options including:
                - workflow_id: The workflow ID (required)
                - run_id: Optional specific run ID
                - page: Page number (default: 1)
                - limit: Records per page (default: 100)
                - sort_by: Field name to sort by
                - order: Sort order, "asc" or "desc"
                - filters: Filter string for data filtering
                - include_anomalies: Whether to include anomaly records

        Returns:
            FetchDataResult: Result containing data page and pagination info

        Raises:
            KadoaHttpError: If API request fails or workflow not found
        """
        api = get_workflows_api(self.client)
        try:
            response = api.v4_workflows_workflow_id_data_get(
                workflow_id=options.workflow_id,
                run_id=options.run_id,
                sort_by=options.sort_by,
                order=options.order,
                filters=options.filters,
                page=options.page or 1,
                limit=options.limit or self._default_limit,
                include_anomalies=options.include_anomalies,
            )

            if isinstance(response, V4WorkflowsWorkflowIdDataGet200Response):
                result = response
            elif hasattr(response, "data"):
                result = response.data
            else:
                result = response

            pagination_obj = getattr(result, "pagination", None)
            if pagination_obj:
                pagination = PageInfo(
                    total_count=getattr(pagination_obj, "total_count", None),
                    page=getattr(pagination_obj, "page", None),
                    total_pages=getattr(pagination_obj, "total_pages", None),
                    limit=getattr(pagination_obj, "limit", None),
                )
            else:
                pagination = PageInfo(
                    page=options.page or 1,
                    limit=options.limit or self._default_limit,
                )

            data: List[Dict[str, Any]] = getattr(result, "data", [])
            if not isinstance(data, list):
                data = []

            # Convert executed_at datetime to ISO string if needed
            executed_at = getattr(result, "executed_at", None)
            if executed_at is not None and isinstance(executed_at, datetime):
                executed_at = executed_at.isoformat()

            return FetchDataResult(
                data=data,
                workflow_id=options.workflow_id,
                run_id=getattr(result, "run_id", None) or options.run_id,
                executed_at=executed_at,
                pagination=pagination,
            )
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message=KadoaSdkError.ERROR_MESSAGES["DATA_FETCH_FAILED"],
                details={
                    "workflowId": options.workflow_id,
                    "runId": options.run_id,
                    "page": options.page,
                    "limit": options.limit,
                },
            )

    def fetch_all_data(self, options: FetchDataOptions) -> List[Dict[str, Any]]:
        """Fetch all pages of workflow data (auto-pagination).

        Automatically fetches all pages of data by making multiple requests.
        Convenient for small to medium datasets where loading all data at once
        is acceptable.

        Args:
            options: Fetch data options. The page parameter is ignored as
                all pages are fetched. Limit controls records per page request.

        Returns:
            List[Dict[str, Any]]: Combined list of all records across all pages.
                Each record is a dictionary containing extracted field values.

        Raises:
            KadoaHttpError: If API requests fail
        """

        def fetch_page(page_options: PageOptions) -> PagedResponse[Dict[str, Any]]:
            fetch_result = self.fetch_data(
                FetchDataOptions(
                    workflow_id=options.workflow_id,
                    run_id=options.run_id,
                    sort_by=options.sort_by,
                    order=options.order,
                    filters=options.filters,
                    include_anomalies=options.include_anomalies,
                    page=page_options.page,
                    limit=page_options.limit or options.limit or self._default_limit,
                )
            )
            return PagedResponse(
                data=fetch_result.data,
                pagination=fetch_result.pagination or PageInfo(),
            )

        iterator = PagedIterator(fetch_page)
        all_data: List[Dict[str, Any]] = iterator.fetch_all(
            PageOptions(limit=options.limit or self._default_limit)
        )
        return all_data

    async def fetch_data_pages(
        self, options: FetchDataOptions
    ) -> AsyncGenerator[FetchDataResult, None]:
        """Async generator for paginated workflow data pages.

        Provides an async generator that yields pages of data sequentially.
        Memory-efficient for large datasets as only one page is held in memory
        at a time.

        Args:
            options: Fetch data options. Limit controls records per page.

        Yields:
            FetchDataResult: Each page of data with pagination information

        Raises:
            KadoaHttpError: If API requests fail

        Example:
            ```python
            async for page in data_fetcher.fetch_data_pages(
                FetchDataOptions(workflow_id="workflow-123", limit=100)
            ):
                process_page(page.data)
            ```
        """
        from ...core.pagination import PagedResponse

        def fetch_page(page_options: PageOptions) -> PagedResponse[Dict[str, Any]]:
            fetch_result = self.fetch_data(
                FetchDataOptions(
                    workflow_id=options.workflow_id,
                    run_id=options.run_id,
                    sort_by=options.sort_by,
                    order=options.order,
                    filters=options.filters,
                    include_anomalies=options.include_anomalies,
                    page=page_options.page,
                    limit=page_options.limit or options.limit or self._default_limit,
                )
            )
            return PagedResponse(
                data=fetch_result.data,
                pagination=fetch_result.pagination or PageInfo(),
            )

        iterator = PagedIterator(fetch_page)

        async for page in iterator.pages(PageOptions(limit=options.limit or self._default_limit)):
            # Convert PagedResponse back to FetchDataResult
            page_data: List[Dict[str, Any]] = page.data
            yield FetchDataResult(
                data=page_data,
                workflow_id=options.workflow_id,
                run_id=options.run_id,
                pagination=page.pagination,
            )
