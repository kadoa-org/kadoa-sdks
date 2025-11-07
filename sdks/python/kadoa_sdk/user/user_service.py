"""User service for retrieving current user information"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, List

from pydantic import BaseModel

from ..core.core_acl import RESTClientObject
from ..core.exceptions import KadoaErrorCode, KadoaHttpError, KadoaSdkError

if TYPE_CHECKING:  # pragma: no cover
    from ..client import KadoaClient

USER_API_ENDPOINT = "/v5/user"


class KadoaUser(BaseModel):
    """User information from Kadoa API"""

    user_id: str
    email: str
    feature_flags: List[str]


class UserService:
    """Service for managing user-related operations"""

    def __init__(self, client: "KadoaClient") -> None:
        self.client = client

    async def get_current_user(self) -> KadoaUser:
        """Get current user details

        Returns:
            KadoaUser: User details including userId, email, and featureFlags

        Raises:
            KadoaHttpError: If API request fails
            KadoaSdkError: If user data is invalid
        """
        url = f"{self.client.base_url}{USER_API_ENDPOINT}"
        headers = self._build_headers()

        try:
            rest = RESTClientObject(self.client.configuration)
            try:
                response = rest.request(
                    "GET",
                    url,
                    headers={"Content-Type": "application/json", **headers},
                )

                # Check HTTP status code
                if response.status >= 400:
                    response_data = response.read()
                    try:
                        error_data = json.loads(response_data) if response_data else {}
                    except json.JSONDecodeError:
                        error_data = {}

                    raise KadoaHttpError(
                        f"HTTP {response.status}: Failed to get current user",
                        http_status=response.status,
                        endpoint=url,
                        method="GET",
                        response_body=error_data,
                        code=KadoaHttpError.map_status_to_code(response.status),
                        details={"url": url, "status": response.status},
                    )

                response_data = response.read()
                data = json.loads(response_data)
            finally:
                pass  # RESTClientObject doesn't have a close method

            if not data or not data.get("userId"):
                raise KadoaSdkError(
                    "Invalid user data received",
                    code=KadoaErrorCode.UNKNOWN,
                    details={"hasUserId": bool(data.get("userId") if data else False)},
                )

            # Handle featureFlags - convert to list if it's a dict or missing
            feature_flags = data.get("featureFlags", [])
            if isinstance(feature_flags, dict):
                feature_flags = []
            elif not isinstance(feature_flags, list):
                feature_flags = []

            return KadoaUser(
                user_id=data["userId"],
                email=data["email"],
                feature_flags=feature_flags,
            )
        except KadoaHttpError:
            raise
        except KadoaSdkError:
            raise
        except Exception as error:
            raise KadoaHttpError.wrap(
                error,
                message="Failed to get current user",
                details={"url": url},
            )

    def _build_headers(self) -> dict[str, str]:
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
