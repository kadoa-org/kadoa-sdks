from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from ..core.exceptions import KadoaErrorCode, KadoaSdkError
from ..core.http import get_workflows_api
from .types import (
    Change,
    ChangeDifference,
    ChangeDifferenceField,
    ListChangesOptions,
    ListChangesResult,
)

if TYPE_CHECKING:  # pragma: no cover
    from ..client import KadoaClient


def _map_field(raw: Any) -> ChangeDifferenceField:
    return ChangeDifferenceField(
        key=getattr(raw, "key", None),
        value=getattr(raw, "value", None),
        previous_value=getattr(raw, "previous_value", None),
    )


def _map_difference(raw: Any) -> ChangeDifference:
    fields_raw = getattr(raw, "fields", None) or []
    return ChangeDifference(
        type=getattr(raw, "type", None),
        fields=[_map_field(f) for f in fields_raw] if fields_raw else None,
    )


def _merge_added_removed(added: Any, removed: Any) -> ChangeDifference:
    """Pair an added+removed for the same row into a single 'changed' diff."""
    previous_by_key: Dict[str, Optional[str]] = {}
    for f in getattr(removed, "fields", None) or []:
        key = getattr(f, "key", None)
        if key is not None:
            previous_by_key[key] = getattr(f, "value", None)

    fields: List[ChangeDifferenceField] = []
    added_keys = set()
    for f in getattr(added, "fields", None) or []:
        key = getattr(f, "key", None)
        added_keys.add(key)
        fields.append(
            ChangeDifferenceField(
                key=key,
                value=getattr(f, "value", None),
                previous_value=previous_by_key.get(key) if key is not None else None,
            )
        )

    for f in getattr(removed, "fields", None) or []:
        key = getattr(f, "key", None)
        if key not in added_keys:
            fields.append(
                ChangeDifferenceField(
                    key=key,
                    value=None,
                    previous_value=getattr(f, "value", None),
                )
            )

    return ChangeDifference(type="changed", fields=fields)


def _coalesce_differences(raw: Optional[List[Any]]) -> Optional[List[ChangeDifference]]:
    """Coalesce added+removed pairs sharing rowRef identity into 'changed' diffs.

    Mirrors the Node SDK behavior. ``row_ref`` is present on the wire but not
    in the OpenAPI spec; we read it defensively.
    """
    if not raw:
        return None

    added_by_row: Dict[str, Any] = {}
    removed_by_row: Dict[str, Any] = {}
    passthrough: List[Any] = []

    for diff in raw:
        row_ref = getattr(diff, "row_ref", None)
        # Pydantic models with alias 'rowRef' may also expose attribute names
        if row_ref is None and hasattr(diff, "model_extra"):
            row_ref = (diff.model_extra or {}).get("rowRef") or (diff.model_extra or {}).get(
                "row_ref"
            )
        diff_type = getattr(diff, "type", None)
        current_row_id = getattr(row_ref, "current_row_id", None) if row_ref else None
        previous_row_id = getattr(row_ref, "previous_row_id", None) if row_ref else None
        if isinstance(row_ref, dict):
            current_row_id = row_ref.get("currentRowId") or row_ref.get("current_row_id")
            previous_row_id = row_ref.get("previousRowId") or row_ref.get("previous_row_id")

        if diff_type == "added" and current_row_id:
            added_by_row[current_row_id] = diff
        elif diff_type == "removed" and previous_row_id:
            removed_by_row[previous_row_id] = diff
        else:
            passthrough.append(diff)

    result: List[ChangeDifference] = []
    for row_id, added in added_by_row.items():
        removed = removed_by_row.pop(row_id, None)
        if removed is not None:
            result.append(_merge_added_removed(added, removed))
        else:
            result.append(_map_difference(added))

    for removed in removed_by_row.values():
        result.append(_map_difference(removed))

    for diff in passthrough:
        result.append(_map_difference(diff))

    return result


def _map_change(raw: Any) -> Change:
    created_at = getattr(raw, "created_at", None)
    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()
    return Change(
        id=getattr(raw, "id", None),
        workflow_id=getattr(raw, "workflow_id", None),
        data=getattr(raw, "data", None),
        differences=_coalesce_differences(getattr(raw, "differences", None)),
        url=getattr(raw, "url", None),
        summary=getattr(raw, "summary", None),
        screenshot_url=getattr(raw, "screenshot_url", None),
        created_at=created_at,
    )


class ChangesService:
    """Service for querying workflow change diffs.

    Wraps the ``/v4/changes`` endpoints to provide structured change data
    for real-time monitoring workflows.
    """

    def __init__(self, client: "KadoaClient") -> None:
        self.client = client

    def _api(self):
        return get_workflows_api(self.client)

    def list(self, options: Optional[ListChangesOptions] = None) -> ListChangesResult:
        """List changes across one or more workflows."""
        opts = options or ListChangesOptions()
        response = self._api().v4_changes_get(
            workflow_ids=opts.workflow_ids,
            start_date=opts.start_date,
            end_date=opts.end_date,
            skip=opts.skip,
            limit=opts.limit,
            exclude=opts.exclude,
        )
        changes_raw = getattr(response, "changes", None) or []
        return ListChangesResult(
            changes=[_map_change(c) for c in changes_raw],
            pagination=getattr(response, "pagination", None),
            changes_count=getattr(response, "changes_count", None) or 0,
        )

    def get(self, change_id: str) -> Change:
        """Get a single change by ID."""
        response = self._api().v4_changes_change_id_get(change_id=change_id)
        if response is None:
            raise KadoaSdkError(
                f"Change not found: {change_id}",
                code=KadoaErrorCode.NOT_FOUND,
                details={"changeId": change_id},
            )
        return _map_change(response)
