from __future__ import annotations

import json
from enum import Enum
from typing import Any, Dict, Optional

from .core_acl import ApiException


class KadoaErrorCode(str, Enum):
    """Error code constants matching Node.js SDK

    Uses str, Enum to allow both enum comparison and string usage for backward compatibility.
    """

    UNKNOWN = "UNKNOWN"
    CONFIG_ERROR = "CONFIG_ERROR"
    AUTH_ERROR = "AUTH_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    BAD_REQUEST = "BAD_REQUEST"
    NOT_FOUND = "NOT_FOUND"
    RATE_LIMITED = "RATE_LIMITED"
    ABORTED = "ABORTED"
    TIMEOUT = "TIMEOUT"
    NETWORK_ERROR = "NETWORK_ERROR"
    HTTP_ERROR = "HTTP_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"


# Type alias for type hints (backward compatibility)
KadoaErrorCodeType = str


class KadoaSdkError(Exception):
    ERROR_MESSAGES = {
        # General errors
        "CONFIG_ERROR": "Invalid configuration provided",
        "AUTH_FAILED": "Authentication failed. Please check your API key",
        "RATE_LIMITED": "Rate limit exceeded. Please try again later",
        "NETWORK_ERROR": "Network error occurred",
        "SERVER_ERROR": "Server error occurred",
        "PARSE_ERROR": "Failed to parse response",
        "BAD_REQUEST": "Bad request",
        "ABORTED": "Aborted",
        "NOT_FOUND": "Not found",
        # Workflow specific errors
        "NO_WORKFLOW_ID": "Failed to start extraction process - no ID received",
        "WORKFLOW_CREATE_FAILED": "Failed to create workflow",
        "WORKFLOW_TIMEOUT": "Workflow processing timed out",
        "WORKFLOW_UNEXPECTED_STATUS": "Extraction completed with unexpected status",
        "PROGRESS_CHECK_FAILED": "Failed to check extraction progress",
        "DATA_FETCH_FAILED": "Failed to retrieve extracted data from workflow",
        # Extraction specific errors
        "NO_URLS": "At least one URL is required for extraction",
        "NO_API_KEY": "API key is required for entity detection",
        "LINK_REQUIRED": "Link is required for entity field detection",
        "NO_PREDICTIONS": "No entity predictions returned from the API",
        "EXTRACTION_FAILED": "Data extraction failed for the provided URLs",
        "ENTITY_FETCH_FAILED": "Failed to fetch entity fields",
        "ENTITY_INVARIANT_VIOLATION": "No valid entity provided",
        # Schema specific errors
        "SCHEMA_NOT_FOUND": "Schema not found",
        "SCHEMA_FETCH_ERROR": "Failed to fetch schema",
        "SCHEMAS_FETCH_ERROR": "Failed to fetch schemas",
        "SCHEMA_CREATE_FAILED": "Failed to create schema",
        "SCHEMA_UPDATE_FAILED": "Failed to update schema",
        "SCHEMA_DELETE_FAILED": "Failed to delete schema",
    }

    def __init__(
        self,
        message: str,
        *,
        code: KadoaErrorCodeType = KadoaErrorCode.UNKNOWN,
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None,
    ) -> None:
        super().__init__(message)
        self.name = "KadoaSdkError"
        self.code = code
        self.details = details
        self.cause = cause

    @classmethod
    def from_error(
        cls,
        error: Any,
        details: Optional[Dict[str, Any]] = None,
    ) -> "KadoaSdkError":
        """Create exception from unknown error type

        Args:
            error: The error to convert (Exception, str, or other)
            details: Optional additional error details

        Returns:
            KadoaSdkError instance wrapping the provided error
        """
        if isinstance(error, KadoaSdkError):
            return error
        message = (
            getattr(error, "message", None) or str(error)
            if isinstance(error, Exception)
            else str(error)
            if isinstance(error, str)
            else "Unexpected error"
        )
        return KadoaSdkError(
            message,
            code=KadoaErrorCode.UNKNOWN,
            details=details,
            cause=error if isinstance(error, Exception) else None,
        )

    @classmethod
    def is_instance(cls, error: Any) -> bool:
        """Check if error is an instance of KadoaSdkError"""
        return isinstance(error, KadoaSdkError)

    def to_json(self) -> Dict[str, Any]:
        """Convert exception to JSON-serializable dict"""
        return {
            "name": self.name,
            "message": str(self),
            "code": self.code,
            "details": self.details,
        }

    def to_detailed_string(self) -> str:
        """Get detailed string representation"""
        parts = [f"{self.name}: {str(self)}", f"Code: {self.code}"]
        if self.details and len(self.details) > 0:
            parts.append(f"Details: {json.dumps(self.details, indent=2)}")
        if self.cause:
            parts.append(f"Cause: {self.cause}")
        return "\n".join(parts)

    @classmethod
    def wrap(
        cls,
        error: Any,
        *,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> "KadoaSdkError":
        if isinstance(error, KadoaSdkError):
            return error
        if isinstance(error, Exception):
            error_message = message or getattr(error, "message", None) or str(error)
        elif isinstance(error, str):
            error_message = message or error
        else:
            error_message = message or "Unexpected error"
        return KadoaSdkError(
            error_message,
            code=KadoaErrorCode.UNKNOWN,
            details=details,
            cause=error if isinstance(error, Exception) else None,
        )


class KadoaHttpError(KadoaSdkError):
    def __init__(
        self,
        message: str,
        *,
        http_status: Optional[int] = None,
        request_id: Optional[str] = None,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        response_body: Optional[object] = None,
        code: KadoaErrorCodeType = KadoaErrorCode.UNKNOWN,
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None,
    ) -> None:
        super().__init__(message, code=code, details=details, cause=cause)
        self.name = "KadoaHttpError"
        self.http_status = http_status
        self.request_id = request_id
        self.endpoint = endpoint
        self.method = method
        self.response_body = response_body

    @staticmethod
    def from_api_exception(
        error: ApiException,
        *,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> "KadoaHttpError":
        status = getattr(error, "status", None)
        response_body = getattr(error, "data", None) or getattr(error, "body", None)
        return KadoaHttpError(
            message or str(error),
            http_status=status,
            response_body=response_body,
            code=KadoaHttpError.map_status_to_code(status),
            details=details,
            cause=error,
        )

    @staticmethod
    def wrap(
        error: Exception, *, message: Optional[str] = None, details: Optional[Dict[str, Any]] = None
    ) -> "KadoaSdkError":
        if isinstance(error, KadoaHttpError):
            return error
        if isinstance(error, KadoaSdkError):
            return error
        if isinstance(error, ApiException):
            return KadoaHttpError.from_api_exception(error, message=message, details=details)
        
        # Check for SSL certificate errors and provide user-friendly message
        error_str = str(error).lower()
        error_type = type(error).__name__
        if (
            "ssl" in error_str
            or "certificate" in error_str
            or "cert" in error_str
            or "SSLError" in error_type
            or "CERTIFICATE_VERIFY_FAILED" in str(error)
        ):
            return KadoaHttpError(
                "SSL certificate verification failed. This usually happens when Python cannot verify "
                "the server's SSL certificate. The SDK uses certifi for certificate verification. "
                "If this error persists, try: pip install --upgrade certifi",
                code=KadoaErrorCode.NETWORK_ERROR,
                details={
                    "issue": "SSL certificate verification failed",
                    "common_causes": [
                        "Python installation doesn't have access to system certificates",
                        "certifi package is outdated or corrupted",
                        "Network proxy or firewall interfering with SSL",
                    ],
                    "solutions": [
                        "Upgrade certifi: pip install --upgrade certifi",
                        "Reinstall certifi: pip install --force-reinstall certifi",
                        "Check your network/proxy settings",
                    ],
                    "original_error": str(error),
                },
                cause=error,
            )
        
        return KadoaSdkError.wrap(error, message=message, details=details)

    def to_json(self) -> Dict[str, Any]:
        """Convert exception to JSON-serializable dict"""
        result = super().to_json()
        result.update(
            {
                "httpStatus": self.http_status,
                "requestId": self.request_id,
                "endpoint": self.endpoint,
                "method": self.method,
                "responseBody": self.response_body,
            }
        )
        return result

    def to_detailed_string(self) -> str:
        """Get detailed string representation"""
        parts = [f"{self.name}: {str(self)}", f"Code: {self.code}"]
        if self.http_status:
            parts.append(f"HTTP Status: {self.http_status}")
        if self.method and self.endpoint:
            parts.append(f"Request: {self.method} {self.endpoint}")
        if self.request_id:
            parts.append(f"Request ID: {self.request_id}")
        if self.response_body:
            parts.append(f"Response Body: {json.dumps(self.response_body, indent=2)}")
        if self.details and len(self.details) > 0:
            parts.append(f"Details: {json.dumps(self.details, indent=2)}")
        if self.cause:
            parts.append(f"Cause: {self.cause}")
        return "\n".join(parts)

    @staticmethod
    def map_status_to_code(
        error_or_status: Optional[int | ApiException],
    ) -> KadoaErrorCodeType:
        """Map HTTP status code or error to error code"""
        status: Optional[int] = None
        if isinstance(error_or_status, int):
            status = error_or_status
        elif isinstance(error_or_status, ApiException):
            status = getattr(error_or_status, "status", None)

        if status is None:
            # Check for network errors in ApiException
            if isinstance(error_or_status, ApiException):
                # Check for connection/timeout errors
                error_str = str(error_or_status).lower()
                if "timeout" in error_str or "timed out" in error_str:
                    return KadoaErrorCode.TIMEOUT
                if "connection" in error_str or "network" in error_str:
                    return KadoaErrorCode.NETWORK_ERROR
            return KadoaErrorCode.UNKNOWN

        if status in (401, 403):
            return KadoaErrorCode.AUTH_ERROR
        if status == 404:
            return KadoaErrorCode.NOT_FOUND
        if status == 408:
            return KadoaErrorCode.TIMEOUT
        if status == 429:
            return KadoaErrorCode.RATE_LIMITED
        if 400 <= status < 500:
            return KadoaErrorCode.VALIDATION_ERROR
        if status >= 500:
            return KadoaErrorCode.HTTP_ERROR
        return KadoaErrorCode.UNKNOWN


# Export ERROR_MESSAGES as standalone constant to match Node SDK API
ERROR_MESSAGES = KadoaSdkError.ERROR_MESSAGES
