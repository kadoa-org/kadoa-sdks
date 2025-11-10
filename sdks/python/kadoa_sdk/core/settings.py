"""Centralized environment variable configuration for Kadoa SDK.

This module provides type-safe configuration management using pydantic-settings.
All environment variables are loaded automatically with validation and type conversion.

Supported Environment Variables:
    KADOA_API_KEY (str, optional): Kadoa API key for authentication
    KADOA_PUBLIC_API_URI (str, default: "https://api.kadoa.com"): Base URL for Kadoa API
    KADOA_TIMEOUT (int, default: 30000): Request timeout in milliseconds
    KADOA_WSS_API_URI (str, default: "wss://realtime.kadoa.com"): WebSocket URL for realtime
    KADOA_REALTIME_API_URI (str, default: "https://realtime.kadoa.com"): Realtime API URL
    DEBUG (str, optional): Enable debug logging (e.g., "kadoa:*", "kadoa:extraction")

Configuration Precedence:
    1. Environment variables (highest priority)
    2. .env file (fallback if env var not set)
    3. Default value

Note: API URIs (public_api_uri, wss_api_uri, realtime_api_uri) can only be configured via
environment variables, not through KadoaClientConfig.

The SDK automatically loads variables from:
    - System environment variables (checked first)
    - .env file in workspace root or Python SDK root (used as fallback)

Example:
    ```python
    from kadoa_sdk.core.settings import get_settings

    settings = get_settings()
    print(settings.public_api_uri)  # Uses env var or default
    timeout_seconds = settings.get_timeout_seconds()  # Converts ms to seconds
    ```
"""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from dotenv import find_dotenv
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _find_env_file() -> Optional[str]:
    """Find .env file using python-dotenv's standard search.

    Searches upward from current file location and current working directory.
    """
    # find_dotenv searches upward from caller's file location, usecwd=True also checks CWD
    env_path = find_dotenv(usecwd=True)
    return env_path if env_path else None


class KadoaSettings(BaseSettings):
    """Centralized settings for Kadoa SDK loaded from environment variables.

    Supports loading from (in priority order):
    1. Environment variables (e.g., KADOA_API_KEY) - highest priority
    2. .env files (fallback if env var not set)
    3. Default values

    Precedence: Explicit config > Environment variable > .env file > Default value
    """

    api_key: Optional[str] = Field(
        default=None,
        validation_alias="KADOA_API_KEY",
        description="Kadoa API key for authentication",
    )
    public_api_uri: str = Field(
        default="https://api.kadoa.com",
        validation_alias="KADOA_PUBLIC_API_URI",
        description="Base URL for Kadoa API",
    )
    timeout_ms: int = Field(
        default=30000,
        validation_alias="KADOA_TIMEOUT",
        description="Request timeout in milliseconds",
        gt=0,
    )
    wss_api_uri: str = Field(
        default="wss://realtime.kadoa.com",
        validation_alias="KADOA_WSS_API_URI",
        description="WebSocket URL for realtime connections",
    )
    realtime_api_uri: str = Field(
        default="https://realtime.kadoa.com",
        validation_alias="KADOA_REALTIME_API_URI",
        description="Realtime API URL for OAuth token requests",
    )

    model_config = SettingsConfigDict(
        # .env file path (used as fallback when env vars are not set)
        env_file=_find_env_file(),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        validate_default=True,
        # Note: Environment variables have priority over .env file by default
        # This is the standard Pydantic Settings behavior
    )

    @field_validator("public_api_uri", "wss_api_uri", "realtime_api_uri")
    @classmethod
    def validate_uri(cls, v: str) -> str:
        """Validate that URI fields are non-empty strings."""
        if not v or not isinstance(v, str):
            raise ValueError("URI must be a non-empty string")
        return v.strip()

    def get_timeout_seconds(self) -> int:
        """Convert timeout from milliseconds to seconds.

        Returns:
            Timeout in seconds (minimum 1 second)
        """
        return max(1, self.timeout_ms // 1000)


@lru_cache(maxsize=1)
def get_settings() -> KadoaSettings:
    """Get Kadoa settings instance (cached).

    The settings instance is cached to avoid reloading environment variables
    on every call, improving performance.

    Returns:
        KadoaSettings: Settings instance loaded from environment variables
    """
    return KadoaSettings()
