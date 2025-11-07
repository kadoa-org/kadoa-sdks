from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from pydantic import BaseModel

if TYPE_CHECKING:  # pragma: no cover
    from ...client import KadoaClient
from ...core.core_acl import RESTClientObject
from ...core.exceptions import KadoaErrorCode, KadoaHttpError, KadoaSdkError
from ..types import EntityConfig, LocationConfig

ENTITY_API_ENDPOINT = "/v4/entity"


class ResolvedEntity(BaseModel):
    """Resolved entity with fields"""

    entity: Optional[str] = None
    fields: List[Dict[str, Any]] = []


class EntityResolverService:
    """Service for resolving entities and their fields from various sources"""

    def __init__(self, client: "KadoaClient") -> None:
        self.client = client

    def resolve_entity(
        self,
        entity_config: EntityConfig,
        options: Optional[Dict[str, Any]] = None,
    ) -> ResolvedEntity:
        """
        Resolves entity and fields from the provided entity configuration

        Args:
            entity_config: The entity configuration to resolve
            options: Additional options for AI detection
                (link, location, navigationMode, selectorMode)

        Returns:
            ResolvedEntity with entity and fields
        """
        if entity_config == "ai-detection":
            if not options or not options.get("link"):
                raise KadoaSdkError(
                    KadoaSdkError.ERROR_MESSAGES["LINK_REQUIRED"],
                    code=KadoaErrorCode.VALIDATION_ERROR,
                    details={"entityConfig": entity_config, "options": options},
                )

            # Detect entity fields using AI
            entity_prediction = self.fetch_entity_fields(
                link=options["link"],
                location=options.get("location"),
                navigation_mode=options.get("navigationMode"),
                selector_mode=options.get("selectorMode", False),
            )

            return ResolvedEntity(
                entity=entity_prediction.get("entity"),
                fields=entity_prediction.get("fields", []),
            )
        elif isinstance(entity_config, dict):
            if "schemaId" in entity_config:
                # Schema ID resolution - not yet implemented in Python SDK
                # TODO: Implement when schemas service is available
                raise KadoaSdkError(
                    "Schema ID resolution is not yet implemented in Python SDK",
                    code="NOT_IMPLEMENTED",
                    details={"schemaId": entity_config["schemaId"]},
                )
            elif "fields" in entity_config:
                # Convert Pydantic field instances to dictionaries
                fields_list = []
                for field in entity_config["fields"]:
                    if hasattr(field, "model_dump"):
                        fields_list.append(field.model_dump())
                    elif isinstance(field, dict):
                        fields_list.append(field)
                    else:
                        # Fallback: try to convert to dict
                        fields_list.append(dict(field) if hasattr(field, "__dict__") else field)

                return ResolvedEntity(
                    entity=entity_config.get("name"),
                    fields=fields_list,
                )

        raise KadoaSdkError(
            KadoaSdkError.ERROR_MESSAGES.get(
                "ENTITY_INVARIANT_VIOLATION", "Invalid entity configuration"
            ),
            code=KadoaErrorCode.VALIDATION_ERROR,
            details={"entity": entity_config},
        )

    def fetch_entity_fields(
        self,
        *,
        link: str,
        location: Optional[LocationConfig] = None,
        navigation_mode: Optional[str] = None,
        selector_mode: bool = False,
    ) -> Dict[str, Any]:
        """
        Fetches entity fields dynamically from the /v4/entity endpoint

        Args:
            link: URL to analyze
            location: Location configuration
            navigation_mode: Navigation mode
            selector_mode: Whether to use selector mode

        Returns:
            EntityPrediction containing the detected entity type and fields
        """
        if not link:
            raise KadoaSdkError(
                KadoaSdkError.ERROR_MESSAGES["LINK_REQUIRED"],
                code=KadoaErrorCode.VALIDATION_ERROR,
                details={"link": link},
            )

        url = f"{self.client.base_url}{ENTITY_API_ENDPOINT}"
        headers = self._build_headers()
        body: Dict[str, Any] = {"link": link, "selectorMode": selector_mode}
        if location is not None:
            body["location"] = location
        if navigation_mode is not None:
            body["navigationMode"] = navigation_mode

        try:
            rest = RESTClientObject(self.client.configuration)
            try:
                response = rest.request(
                    "POST",
                    url,
                    headers={"Content-Type": "application/json", **headers},
                    body=body,
                )
                response_data = response.read()
                data = json.loads(response_data)
            finally:
                pass  # RESTClientObject doesn't have a close method

            if (
                not data.get("success")
                or not data.get("entityPrediction")
                or len(data.get("entityPrediction") or []) == 0
            ):
                raise KadoaSdkError(
                    KadoaSdkError.ERROR_MESSAGES["NO_PREDICTIONS"],
                    code=KadoaErrorCode.NOT_FOUND,
                    details={
                        "success": data.get("success"),
                        "hasPredictions": bool(data.get("entityPrediction")),
                        "predictionCount": len(data.get("entityPrediction") or []),
                        "link": link,
                    },
                )
            return data["entityPrediction"][0]
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message=KadoaSdkError.ERROR_MESSAGES["ENTITY_FETCH_FAILED"],
                details={"url": url, "link": link},
            )

    def _build_headers(self) -> Dict[str, str]:
        """Build authentication headers"""
        config = self.client.configuration
        api_key = None
        if getattr(config, "api_key", None):
            api_key = config.api_key.get("ApiKeyAuth")
        if not api_key:
            raise KadoaSdkError(
                KadoaSdkError.ERROR_MESSAGES["NO_API_KEY"],
                code=KadoaErrorCode.AUTH_ERROR,
                details={"hasApiKey": bool(api_key)},
            )
        return {"x-api-key": api_key}
