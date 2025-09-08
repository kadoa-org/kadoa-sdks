from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any, Dict

from ...core.exceptions import KadoaHttpException, KadoaSdkException

if TYPE_CHECKING:  # pragma: no cover
    from ...client import KadoaClient

ENTITY_API_ENDPOINT = "/v4/entity"


class EntityDetectorService:
    def __init__(self, client: "KadoaClient") -> None:
        self.client = client

    def fetch_entity_fields(
        self, *, link: str, location: Dict[str, Any], navigation_mode: str
    ) -> Dict[str, Any]:
        if not link:
            raise KadoaSdkException(
                KadoaSdkException.ERROR_MESSAGES["LINK_REQUIRED"],
                code="VALIDATION_ERROR",
                details={"link": link},
            )

        url = f"{self.client.base_url}{ENTITY_API_ENDPOINT}"
        headers = self._build_headers()
        body = {"link": link, "location": location, "navigationMode": navigation_mode}

        try:
            from openapi_client.rest import RESTClientObject

            rest = RESTClientObject(self.client.configuration)
            response = rest.request(
                "POST",
                url,
                headers={"Content-Type": "application/json", **headers},
                body=body,
            )
            data = json.loads(response.read())
            if not data.get("success") or not data.get("entityPrediction"):
                raise KadoaSdkException(
                    KadoaSdkException.ERROR_MESSAGES["NO_PREDICTIONS"],
                    code="NOT_FOUND",
                    details={
                        "success": data.get("success"),
                        "hasPredictions": bool(data.get("entityPrediction")),
                        "predictionCount": len(data.get("entityPrediction") or []),
                        "link": link,
                    },
                )
            return data["entityPrediction"][0]
        except Exception as error:
            raise KadoaHttpException.wrap(
                error,
                message=KadoaSdkException.ERROR_MESSAGES["ENTITY_FETCH_FAILED"],
                details={"url": url, "link": link},
            )

    def _build_headers(self) -> Dict[str, str]:
        config = self.client.configuration
        api_key = None
        if getattr(config, "api_key", None):
            api_key = config.api_key.get("ApiKeyAuth")
        if not api_key:
            raise KadoaSdkException(
                KadoaSdkException.ERROR_MESSAGES["NO_API_KEY"],
                code="AUTH_ERROR",
                details={"hasApiKey": bool(api_key)},
            )
        return {"x-api-key": api_key}
