"""
Kadoa SDK exceptions.
"""

from typing import Optional, Dict, Any
from enum import Enum
import requests


class KadoaErrorCode(str, Enum):
    """Error codes for Kadoa SDK exceptions."""

    UNKNOWN = "UNKNOWN"
    CONFIG_ERROR = "CONFIG_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    AUTH_ERROR = "AUTH_ERROR"
    NOT_FOUND = "NOT_FOUND"
    RATE_LIMITED = "RATE_LIMITED"
    HTTP_ERROR = "HTTP_ERROR"
    NETWORK_ERROR = "NETWORK_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    TIMEOUT = "TIMEOUT"


class KadoaSdkException(Exception):
    """Base exception for Kadoa SDK errors."""

    def __init__(
        self,
        message: str,
        code: KadoaErrorCode = KadoaErrorCode.UNKNOWN,
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}
        self.cause = cause

    def __str__(self) -> str:
        if self.details:
            return f"{self.message} (code: {self.code}, details: {self.details})"
        return f"{self.message} (code: {self.code})"


class KadoaHttpException(KadoaSdkException):
    """HTTP-specific exception for API errors."""

    def __init__(
        self,
        message: str,
        http_status: Optional[int] = None,
        request_id: Optional[str] = None,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        response_body: Optional[Any] = None,
        code: Optional[KadoaErrorCode] = None,
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None,
    ):
        super().__init__(
            message, code=code or KadoaErrorCode.HTTP_ERROR, details=details, cause=cause
        )
        self.http_status = http_status
        self.request_id = request_id
        self.endpoint = endpoint
        self.method = method
        self.response_body = response_body

    def __str__(self) -> str:
        parts = [self.message]
        if self.http_status:
            parts.append(f"status: {self.http_status}")
        if self.endpoint:
            parts.append(f"endpoint: {self.endpoint}")
        if self.method:
            parts.append(f"method: {self.method}")
        parts.append(f"code: {self.code}")
        return f"{' ('.join([parts[0], ', '.join(parts[1:])])}"

    @classmethod
    def from_requests_error(
        cls,
        error: requests.RequestException,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> "KadoaHttpException":
        """
        Create a KadoaHttpException from a requests error.

        Args:
            error: The requests exception
            message: Optional custom message
            details: Optional additional details

        Returns:
            KadoaHttpException instance
        """
        response = getattr(error, "response", None)
        status = response.status_code if response is not None else None

        # Extract request ID from headers
        request_id = None
        if response is not None and response.headers:
            request_id = response.headers.get("x-request-id") or response.headers.get(
                "x-amzn-requestid"
            )

        # Extract method and URL
        request = getattr(error, "request", None)
        method = request.method.upper() if request and hasattr(request, "method") else None
        url = request.url if request and hasattr(request, "url") else None

        # Extract response body
        response_body = None
        if response is not None:
            try:
                response_body = response.json()
            except:
                response_body = response.text if hasattr(response, "text") else None

        # Determine error code based on status
        code = cls._map_status_to_code(error, status)

        return cls(
            message=message or str(error),
            http_status=status,
            request_id=request_id,
            endpoint=url,
            method=method,
            response_body=response_body,
            code=code,
            details=details,
            cause=error,
        )

    @staticmethod
    def _map_status_to_code(error: Exception, status: Optional[int]) -> KadoaErrorCode:
        """Map HTTP status code to KadoaErrorCode."""
        if not status:
            # Check for timeout errors
            if isinstance(error, requests.Timeout):
                return KadoaErrorCode.TIMEOUT
            # Check for connection errors
            elif isinstance(error, requests.ConnectionError):
                return KadoaErrorCode.NETWORK_ERROR
            return KadoaErrorCode.UNKNOWN

        if status in (401, 403):
            return KadoaErrorCode.AUTH_ERROR
        elif status == 404:
            return KadoaErrorCode.NOT_FOUND
        elif status == 408:
            return KadoaErrorCode.TIMEOUT
        elif status == 429:
            return KadoaErrorCode.RATE_LIMITED
        elif 400 <= status < 500:
            return KadoaErrorCode.VALIDATION_ERROR
        elif status >= 500:
            return KadoaErrorCode.HTTP_ERROR

        return KadoaErrorCode.UNKNOWN

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary."""
        result = {
            "name": self.__class__.__name__,
            "message": self.message,
            "code": self.code.value if isinstance(self.code, KadoaErrorCode) else self.code,
        }

        if self.http_status:
            result["httpStatus"] = self.http_status
        if self.request_id:
            result["requestId"] = self.request_id
        if self.endpoint:
            result["endpoint"] = self.endpoint
        if self.method:
            result["method"] = self.method
        if self.response_body:
            result["responseBody"] = self.response_body
        if self.details:
            result["details"] = self.details

        return result


def wrap_kadoa_error(
    error: Exception, message: str, details: Optional[Dict[str, Any]] = None
) -> KadoaSdkException:
    """
    Wrap an exception in a KadoaSdkException or KadoaHttpException.

    Args:
        error: The original exception
        message: Custom error message
        details: Additional error details

    Returns:
        KadoaSdkException or KadoaHttpException wrapping the original error
    """
    # Already a Kadoa exception, enhance with additional context
    if isinstance(error, KadoaSdkException):
        error.message = f"{message}: {error.message}"
        if details:
            error.details.update(details)
        return error

    # Wrap requests exceptions in KadoaHttpException
    if isinstance(error, requests.RequestException):
        return KadoaHttpException.from_requests_error(error, message, details)

    # Wrap in KadoaSdkException
    return KadoaSdkException(
        message=f"{message}: {str(error)}",
        code=KadoaErrorCode.INTERNAL_ERROR,
        details=details,
        cause=error,
    )


def is_kadoa_sdk_exception(error: Any) -> bool:
    """Check if an error is a KadoaSdkException."""
    return isinstance(error, KadoaSdkException)


def is_kadoa_http_exception(error: Any) -> bool:
    """Check if an error is a KadoaHttpException."""
    return isinstance(error, KadoaHttpException)
