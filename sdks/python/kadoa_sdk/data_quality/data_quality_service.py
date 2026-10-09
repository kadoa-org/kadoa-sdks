"""Per-field data quality rules of a workflow."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, Optional
from urllib.parse import quote

if TYPE_CHECKING:  # pragma: no cover
    from ..client import KadoaClient

# Rules keyed by schema field name, in the JSON shape the API documents.
# Plain dicts on purpose: the generated models turn `editedAt` into a
# `datetime` and serialize it with a `+00:00` offset, which the API rejects.
DataQualityRules = Dict[str, Dict[str, Any]]


class DataQualityService:
    """Read and edit the per-field data quality rules of a workflow.

    Wraps ``/v4/workflows/{workflowId}/schema-validation-rules``.
    Rule edits take effect on the next workflow run.
    """

    def __init__(self, client: "KadoaClient") -> None:
        self.client = client

    @staticmethod
    def _endpoint(workflow_id: str, field_name: Optional[str] = None) -> str:
        path = f"/v4/workflows/{quote(workflow_id, safe='')}/schema-validation-rules"
        if field_name is not None:
            path += f"/{quote(field_name, safe='')}"
        return path

    def get_rules(self, workflow_id: str) -> Optional[DataQualityRules]:
        """Get the rules of a workflow. Returns ``None`` when it has none."""
        response = self.client.make_raw_request(
            "GET",
            self._endpoint(workflow_id),
            error_message="Failed to get data quality rules",
        )
        return response["rules"]

    def upsert_rules(self, workflow_id: str, rules: DataQualityRules) -> DataQualityRules:
        """Replace the rules of the listed fields and leave every other field untouched.

        Returns the merged ruleset. To remove a field's rules, use
        :meth:`delete_field_rules`.
        """
        response = self.client.make_raw_request(
            "PUT",
            self._endpoint(workflow_id),
            body=rules,
            error_message="Failed to update data quality rules",
        )
        return response["rules"]

    def delete_field_rules(self, workflow_id: str, field_name: str) -> DataQualityRules:
        """Remove all rules of a single schema field. Returns the remaining ruleset."""
        response = self.client.make_raw_request(
            "DELETE",
            self._endpoint(workflow_id, field_name),
            error_message="Failed to delete data quality rules",
        )
        return response["rules"]
