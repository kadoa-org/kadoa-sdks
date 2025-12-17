from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional, TypedDict

from pydantic import BaseModel

if TYPE_CHECKING:  # pragma: no cover
    from ...client import KadoaClient
from ...core.exceptions import KadoaErrorCode, KadoaHttpError, KadoaSdkError
from ..types import EntityConfig, LocationConfig

ENTITY_API_ENDPOINT = "/v4/entity"


class EntityDetectionRequest(TypedDict, total=False):
    """Request body for entity detection API"""

    link: str
    selectorMode: bool
    location: Optional[LocationConfig]
    navigationMode: Optional[str]


class EntityPrediction(TypedDict, total=False):
    """Entity prediction structure from AI detection"""

    entity: Optional[str]
    fields: List[Dict[str, Any]]


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
                # Fetch schema from API to get entity and fields
                schema = self.client.schema.get_schema(entity_config["schemaId"])
                # Convert schema fields to list of dicts
                fields_list = []
                schema_fields = getattr(schema, "var_schema", None) or getattr(schema, "schema", None) or []
                for field in schema_fields:
                    # Handle union types (SchemaResponseSchemaInner) - extract actual_instance
                    actual_field = getattr(field, "actual_instance", None) or field
                    if hasattr(actual_field, "model_dump"):
                        fields_list.append(actual_field.model_dump(by_alias=True, exclude_none=True))
                    elif isinstance(actual_field, dict):
                        fields_list.append(actual_field)
                    else:
                        fields_list.append(dict(actual_field) if hasattr(actual_field, "__dict__") else actual_field)
                return ResolvedEntity(
                    entity=getattr(schema, "entity", None),
                    fields=fields_list,
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
    ) -> EntityPrediction:
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

        body: EntityDetectionRequest = {"link": link, "selectorMode": selector_mode}
        if location is not None:
            # Convert Location Pydantic model to dict if needed
            if hasattr(location, "model_dump"):
                body["location"] = location.model_dump(by_alias=True)
            elif isinstance(location, dict):
                body["location"] = location
            else:
                body["location"] = {"type": "auto"}
        if navigation_mode is not None:
            body["navigationMode"] = navigation_mode

        try:
            data = self.client.make_raw_request(
                    "POST",
                ENTITY_API_ENDPOINT,
                    body=body,
                error_message=KadoaSdkError.ERROR_MESSAGES["ENTITY_FETCH_FAILED"],
                )

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
        except KadoaSdkError:
            raise
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message=KadoaSdkError.ERROR_MESSAGES["ENTITY_FETCH_FAILED"],
                details={"link": link},
            )
