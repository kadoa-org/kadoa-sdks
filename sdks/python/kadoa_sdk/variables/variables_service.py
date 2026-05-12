from __future__ import annotations

from typing import TYPE_CHECKING, List, Union

from openapi_client.models.create_variable_body import CreateVariableBody
from openapi_client.models.update_variable_body import UpdateVariableBody
from openapi_client.models.variable import Variable

from ..core.exceptions import KadoaErrorCode, KadoaSdkError
from ..core.http import get_variables_api

if TYPE_CHECKING:  # pragma: no cover
    from ..client import KadoaClient


class VariablesService:
    """Service for managing variables.

    Variables are key-value pairs that can be referenced in workflow
    prompts using @variableKey syntax.
    """

    def __init__(self, client: "KadoaClient") -> None:
        self.client = client

    def _api(self):
        return get_variables_api(self.client)

    def list(self) -> List[Variable]:
        """List all variables in the current team scope."""
        response = self._api().v4_variables_get()
        return list(getattr(response, "variables", []) or [])

    def get(self, variable_id: str) -> Variable:
        """Get a variable by ID."""
        response = self._api().v4_variables_variable_id_get(variable_id=variable_id)
        variable = getattr(response, "variable", None)
        if not variable:
            raise KadoaSdkError(
                f"Variable not found: {variable_id}",
                code=KadoaErrorCode.NOT_FOUND,
                details={"variableId": variable_id},
            )
        return variable

    def create(self, body: Union[CreateVariableBody, dict]) -> Variable:
        """Create a new variable."""
        payload = body if isinstance(body, CreateVariableBody) else CreateVariableBody(**body)
        response = self._api().v4_variables_post(create_variable_body=payload)
        variable = getattr(response, "variable", None)
        if not variable:
            raise KadoaSdkError(
                "Failed to create variable",
                code=KadoaErrorCode.INTERNAL_ERROR,
            )
        return variable

    def update(
        self, variable_id: str, body: Union[UpdateVariableBody, dict]
    ) -> Variable:
        """Update an existing variable."""
        payload = body if isinstance(body, UpdateVariableBody) else UpdateVariableBody(**body)
        response = self._api().v4_variables_variable_id_patch(
            variable_id=variable_id, update_variable_body=payload
        )
        variable = getattr(response, "variable", None)
        if not variable:
            raise KadoaSdkError(
                f"Failed to update variable: {variable_id}",
                code=KadoaErrorCode.INTERNAL_ERROR,
                details={"variableId": variable_id},
            )
        return variable

    def delete(self, variable_id: str) -> None:
        """Delete a variable by ID."""
        self._api().v4_variables_variable_id_delete(variable_id=variable_id)
