from __future__ import annotations

from typing import Any, List, Literal, Optional

from pydantic import BaseModel

ChangeDifferenceType = Literal["added", "removed", "changed"]


class ChangeDifferenceField(BaseModel):
    key: Optional[str] = None
    value: Optional[str] = None
    previous_value: Optional[str] = None


class ChangeDifference(BaseModel):
    type: Optional[ChangeDifferenceType] = None
    fields: Optional[List[ChangeDifferenceField]] = None


class Change(BaseModel):
    """A single change event detected by the monitoring system."""

    id: Optional[str] = None
    workflow_id: Optional[str] = None
    data: Optional[List[Any]] = None
    differences: Optional[List[ChangeDifference]] = None
    url: Optional[str] = None
    summary: Optional[str] = None
    screenshot_url: Optional[str] = None
    created_at: Optional[str] = None


class ListChangesOptions(BaseModel):
    workflow_ids: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    skip: Optional[int] = None
    limit: Optional[int] = None
    exclude: Optional[str] = None


class ListChangesResult(BaseModel):
    changes: List[Change]
    pagination: Optional[Any] = None
    changes_count: int = 0
