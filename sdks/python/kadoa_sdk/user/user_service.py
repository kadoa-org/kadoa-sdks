"""User service for retrieving current user information"""

from __future__ import annotations

from typing import TYPE_CHECKING, List

from pydantic import BaseModel

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
        try:
            data = self.client.make_raw_request(
                    "GET",
                USER_API_ENDPOINT,
                error_message="Failed to get current user",
            )

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
            )
