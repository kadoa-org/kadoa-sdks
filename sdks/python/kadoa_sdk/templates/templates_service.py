from __future__ import annotations

from typing import TYPE_CHECKING, Any, List, Union

from openapi_client.models.create_template_body import CreateTemplateBody
from openapi_client.models.create_template_version_body import CreateTemplateVersionBody
from openapi_client.models.save_from_workflow_body import SaveFromWorkflowBody
from openapi_client.models.save_from_workflow_response_data import SaveFromWorkflowResponseData
from openapi_client.models.template_created_response_data import TemplateCreatedResponseData
from openapi_client.models.template_detail_response_body_data import (
    TemplateDetailResponseBodyData,
)
from openapi_client.models.template_response import TemplateResponse
from openapi_client.models.template_updated_response_data import TemplateUpdatedResponseData
from openapi_client.models.template_schemas_response_data_inner import (
    TemplateSchemasResponseDataInner,
)
from openapi_client.models.template_version_created_response_data import (
    TemplateVersionCreatedResponseData,
)
from openapi_client.models.update_template_body import UpdateTemplateBody

from ..core.exceptions import KadoaErrorCode, KadoaSdkError
from ..core.http import get_templates_api

if TYPE_CHECKING:  # pragma: no cover
    from ..client import KadoaClient


class TemplatesService:
    """Service for managing templates.

    Templates define reusable configurations (prompt, schema, validation,
    notifications) that can be linked to multiple workflows and versioned.
    """

    def __init__(self, client: "KadoaClient") -> None:
        self.client = client

    def _api(self):
        return get_templates_api(self.client)

    def list(self) -> List[TemplateResponse]:
        """List all active templates for the current team."""
        response = self._api().v4_templates_get()
        return list(getattr(response, "data", []) or [])

    def get(self, template_id: str) -> TemplateDetailResponseBodyData:
        """Get a template by ID, including all published versions."""
        response = self._api().v4_templates_template_id_get(template_id=template_id)
        template = getattr(response, "data", None)
        if not template:
            raise KadoaSdkError(
                f"Template not found: {template_id}",
                code=KadoaErrorCode.NOT_FOUND,
                details={"templateId": template_id},
            )
        return template

    def create(
        self, body: Union[CreateTemplateBody, dict]
    ) -> TemplateCreatedResponseData:
        """Create a new template."""
        payload = body if isinstance(body, CreateTemplateBody) else CreateTemplateBody(**body)
        response = self._api().v4_templates_post(create_template_body=payload)
        template = getattr(response, "data", None)
        if not template:
            raise KadoaSdkError(
                "Failed to create template",
                code=KadoaErrorCode.INTERNAL_ERROR,
            )
        return template

    def update(
        self, template_id: str, body: Union[UpdateTemplateBody, dict]
    ) -> TemplateUpdatedResponseData:
        """Update a template's name or description."""
        payload = body if isinstance(body, UpdateTemplateBody) else UpdateTemplateBody(**body)
        response = self._api().v4_templates_template_id_put(
            template_id=template_id, update_template_body=payload
        )
        template = getattr(response, "data", None)
        if not template:
            raise KadoaSdkError(
                f"Failed to update template: {template_id}",
                code=KadoaErrorCode.INTERNAL_ERROR,
                details={"templateId": template_id},
            )
        return template

    def delete(self, template_id: str) -> None:
        """Delete (archive) a template. Existing workflows are unaffected."""
        self._api().v4_templates_template_id_delete(template_id=template_id)

    def create_version(
        self,
        template_id: str,
        body: Union[CreateTemplateVersionBody, dict],
    ) -> TemplateVersionCreatedResponseData:
        """Publish a new version of a template."""
        payload = (
            body
            if isinstance(body, CreateTemplateVersionBody)
            else CreateTemplateVersionBody(**body)
        )
        response = self._api().v4_templates_template_id_versions_post(
            template_id=template_id, create_template_version_body=payload
        )
        version = getattr(response, "data", None)
        if not version:
            raise KadoaSdkError(
                f"Failed to create template version: {template_id}",
                code=KadoaErrorCode.INTERNAL_ERROR,
                details={"templateId": template_id},
            )
        return version

    def list_schemas(self, template_id: str) -> List[TemplateSchemasResponseDataInner]:
        """List schemas associated with a template."""
        response = self._api().v4_templates_template_id_schemas_get(template_id=template_id)
        return list(getattr(response, "data", []) or [])

    def create_from_workflow(
        self, body: Union[SaveFromWorkflowBody, dict]
    ) -> SaveFromWorkflowResponseData:
        """Save a workflow's configuration as a new template or new version."""
        payload = (
            body if isinstance(body, SaveFromWorkflowBody) else SaveFromWorkflowBody(**body)
        )
        response = self._api().v4_templates_from_workflow_post(save_from_workflow_body=payload)
        result = getattr(response, "data", None)
        if not result:
            raise KadoaSdkError(
                "Failed to create template from workflow",
                code=KadoaErrorCode.INTERNAL_ERROR,
                details={"workflowId": getattr(payload, "workflow_id", None)},
            )
        return result
