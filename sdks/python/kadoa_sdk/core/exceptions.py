from __future__ import annotations

from typing import Any, Dict, Optional

from openapi_client.exceptions import ApiException

KadoaErrorCode = str


class KadoaSdkException(Exception):
    ERROR_MESSAGES = {
        "CONFIG_ERROR": "Invalid configuration provided",
        "AUTH_FAILED": "Authentication failed. Please check your API key",
        "RATE_LIMITED": "Rate limit exceeded. Please try again later",
        "NETWORK_ERROR": "Network error occurred",
        "SERVER_ERROR": "Server error occurred",
        "PARSE_ERROR": "Failed to parse response",
        "NO_WORKFLOW_ID": "Failed to start extraction process - no ID received",
        "WORKFLOW_CREATE_FAILED": "Failed to create workflow",
        "WORKFLOW_TIMEOUT": "Workflow processing timed out",
        "WORKFLOW_UNEXPECTED_STATUS": "Extraction completed with unexpected status",
        "PROGRESS_CHECK_FAILED": "Failed to check extraction progress",
        "DATA_FETCH_FAILED": "Failed to retrieve extracted data from workflow",
        "NO_URLS": "At least one URL is required for extraction",
        "NO_API_KEY": "API key is required for entity detection",
        "LINK_REQUIRED": "Link is required for entity field detection",
        "NO_PREDICTIONS": "No entity predictions returned from the API",
        "EXTRACTION_FAILED": "Data extraction failed for the provided URLs",
        "ENTITY_FETCH_FAILED": "Failed to fetch entity fields",
    }

    def __init__(
        self,
        message: str,
        *,
        code: KadoaErrorCode = "UNKNOWN",
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.details = details
        self.cause = cause

    @classmethod
    def wrap(
        cls,
        error: Exception,
        *,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> "KadoaSdkException":
        if isinstance(error, KadoaSdkException):
            return error
        return KadoaSdkException(
            message or str(error), code="UNKNOWN", details=details, cause=error
        )


class KadoaHttpException(KadoaSdkException):
    def __init__(
        self,
        message: str,
        *,
        http_status: Optional[int] = None,
        request_id: Optional[str] = None,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        response_body: Optional[object] = None,
        code: KadoaErrorCode = "UNKNOWN",
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None,
    ) -> None:
        super().__init__(message, code=code, details=details, cause=cause)
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
    ) -> "KadoaHttpException":
        status = getattr(error, "status", None)
        response_body = getattr(error, "data", None) or getattr(error, "body", None)
        return KadoaHttpException(
            message or str(error),
            http_status=status,
            response_body=response_body,
            code=KadoaHttpException.map_status_to_code(status),
            details=details,
            cause=error,
        )

    @staticmethod
    def wrap(
        error: Exception, *, message: Optional[str] = None, details: Optional[Dict[str, Any]] = None
    ) -> "KadoaSdkException":
        if isinstance(error, KadoaHttpException):
            return error
        if isinstance(error, KadoaSdkException):
            return error
        if isinstance(error, ApiException):
            return KadoaHttpException.from_api_exception(error, message=message, details=details)
        return KadoaSdkException.wrap(error, message=message, details=details)

    @staticmethod
    def map_status_to_code(status: Optional[int]) -> KadoaErrorCode:
        if status is None:
            return "UNKNOWN"
        if status in (401, 403):
            return "AUTH_ERROR"
        if status == 404:
            return "NOT_FOUND"
        if status == 408:
            return "TIMEOUT"
        if status == 429:
            return "RATE_LIMITED"
        if 400 <= status < 500:
            return "VALIDATION_ERROR"
        if status >= 500:
            return "HTTP_ERROR"
        return "UNKNOWN"
