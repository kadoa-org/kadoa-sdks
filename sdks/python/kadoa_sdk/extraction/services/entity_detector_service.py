from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, Optional, Union

from ...core.exceptions import KadoaErrorCode, KadoaHttpError, KadoaSdkError

if TYPE_CHECKING:  # pragma: no cover
    from ...client import KadoaClient
    from ..types import LocationConfig

ENTITY_API_ENDPOINT = "/v4/entity"


class EntityDetectorService:
    def __init__(self, client: "KadoaClient") -> None:
        self.client = client

    def fetch_entity_fields(
        self, *, link: str, location: Union[Dict[str, Any], "LocationConfig"], navigation_mode: str
    ) -> Dict[str, Any]:
        if not link:
            raise KadoaSdkError(
                KadoaSdkError.ERROR_MESSAGES["LINK_REQUIRED"],
                code=KadoaErrorCode.VALIDATION_ERROR,
                details={"link": link},
            )

        # Convert Location Pydantic model to dict if needed
        location_dict: Dict[str, Any]
        if location is None:
            location_dict = {"type": "auto"}
        elif hasattr(location, "model_dump"):
            location_dict = location.model_dump(by_alias=True)
        elif isinstance(location, dict):
            location_dict = location
        else:
            location_dict = {"type": "auto"}

        body = {"link": link, "location": location_dict, "navigationMode": navigation_mode}

        try:
            data = self.client.make_raw_request(
                    "POST",
                ENTITY_API_ENDPOINT,
                    body=body,
                error_message=KadoaSdkError.ERROR_MESSAGES["ENTITY_FETCH_FAILED"],
                )

            if not data.get("success") or not data.get("entityPrediction"):
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
