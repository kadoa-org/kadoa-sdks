from __future__ import annotations

from collections.abc import AsyncGenerator
from datetime import datetime
from typing import TYPE_CHECKING, List

from ..extraction_acl import V4WorkflowsWorkflowIdDataGet200Response

if TYPE_CHECKING:  # pragma: no cover
    from ...client import KadoaClient
from ...core.exceptions import KadoaHttpError, KadoaSdkError
from ...core.http import get_workflows_api
from ...core.pagination import PagedIterator, PageInfo, PageOptions
from ..types import FetchDataOptions, FetchDataResult


class DataFetcherService:
    def __init__(self, client: "KadoaClient") -> None:
        self.client = client
        self._default_limit = 100

    def fetch_workflow_data(self, workflow_id: str, limit: int) -> List[dict]:
        """Legacy method for backward compatibility"""
        api = get_workflows_api(self.client)
        try:
            resp = api.v4_workflows_workflow_id_data_get(workflow_id=workflow_id, limit=limit)

            container = getattr(resp, "data", resp)
            if isinstance(container, list):
                return container
            inner = getattr(container, "data", None)
            if isinstance(inner, list):
                return inner
            if isinstance(container, dict) and isinstance(container.get("data"), list):
                return container["data"]
            return []
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message=KadoaSdkError.ERROR_MESSAGES["DATA_FETCH_FAILED"],
                details={"workflowId": workflow_id, "limit": limit},
            )

    def fetch_data(self, options: FetchDataOptions) -> FetchDataResult:
        """
        Fetch a page of workflow data with pagination support

        Args:
            options: Fetch data options including workflow_id, run_id, pagination, etc.

        Returns:
            FetchDataResult with data and pagination info
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

            data = getattr(result, "data", [])
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

    def fetch_all_data(self, options: FetchDataOptions) -> List[dict]:
        """
        Fetch all pages of workflow data (auto-pagination)

        Args:
            options: Fetch data options (page and limit will be overridden)

        Returns:
            List of all data items across all pages
        """
        iterator = PagedIterator(
            lambda page_options: self.fetch_data(
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
        )

        return iterator.fetch_all(PageOptions(limit=options.limit or self._default_limit))

    async def fetch_data_pages(
        self, options: FetchDataOptions
    ) -> AsyncGenerator[FetchDataResult, None]:
        """
        Async generator for paginated workflow data pages

        Args:
            options: Fetch data options

        Yields:
            FetchDataResult for each page
        """
        from ...core.pagination import PagedResponse

        def fetch_page(page_options: PageOptions) -> PagedResponse[dict]:
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
            yield FetchDataResult(
                data=page.data,
                workflow_id=options.workflow_id,
                run_id=options.run_id,
                pagination=page.pagination,
            )
