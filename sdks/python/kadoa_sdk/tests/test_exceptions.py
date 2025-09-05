"""
Unit tests for Kadoa SDK exceptions.
"""

import pytest
import requests
from unittest.mock import Mock

from kadoa_sdk.exceptions import (
    KadoaSdkException,
    KadoaHttpException,
    KadoaErrorCode,
    wrap_kadoa_error,
    is_kadoa_sdk_exception,
    is_kadoa_http_exception,
)


class TestKadoaSdkException:
    """Test KadoaSdkException class."""

    def test_creates_exception_with_message(self):
        """Test creating exception with message."""
        exc = KadoaSdkException("Test error")
        assert str(exc) == "Test error (code: KadoaErrorCode.UNKNOWN)"
        assert exc.message == "Test error"
        assert exc.code == KadoaErrorCode.UNKNOWN

    def test_creates_exception_with_code(self):
        """Test creating exception with specific code."""
        exc = KadoaSdkException("Auth failed", code=KadoaErrorCode.AUTH_ERROR)
        assert exc.code == KadoaErrorCode.AUTH_ERROR
        assert "AUTH_ERROR" in str(exc)

    def test_creates_exception_with_details(self):
        """Test creating exception with details."""
        details = {"url": "https://api.kadoa.com", "method": "GET"}
        exc = KadoaSdkException("Request failed", details=details)
        assert exc.details == details
        assert "details:" in str(exc)


class TestKadoaHttpException:
    """Test KadoaHttpException class."""

    def test_creates_http_exception_with_status(self):
        """Test creating HTTP exception with status code."""
        exc = KadoaHttpException(
            "HTTP error",
            http_status=404,
            endpoint="/api/test",
            method="GET",
        )
        assert exc.http_status == 404
        assert exc.endpoint == "/api/test"
        assert exc.method == "GET"
        assert "status: 404" in str(exc)

    def test_from_requests_error_with_response(self):
        """Test creating from requests error with response."""
        # Mock response
        response = Mock()
        response.status_code = 401
        response.headers = {"x-request-id": "test-123"}
        response.json.return_value = {"error": "Unauthorized"}
        response.text = "Unauthorized"

        # Mock request
        request = Mock()
        request.method = "post"
        request.url = "https://api.kadoa.com/v4/workflows"

        # Mock error
        error = requests.RequestException("Auth failed")
        error.response = response
        error.request = request

        exc = KadoaHttpException.from_requests_error(error, "Custom message")

        assert exc.http_status == 401
        assert exc.request_id == "test-123"
        assert exc.endpoint == "https://api.kadoa.com/v4/workflows"
        assert exc.method == "POST"
        assert exc.response_body == {"error": "Unauthorized"}
        assert exc.code == KadoaErrorCode.AUTH_ERROR

    def test_from_requests_timeout_error(self):
        """Test creating from timeout error."""
        error = requests.Timeout("Request timed out")
        exc = KadoaHttpException.from_requests_error(error)

        assert exc.code == KadoaErrorCode.TIMEOUT
        assert exc.http_status is None

    def test_from_requests_connection_error(self):
        """Test creating from connection error."""
        error = requests.ConnectionError("Connection failed")
        exc = KadoaHttpException.from_requests_error(error)

        assert exc.code == KadoaErrorCode.NETWORK_ERROR
        assert exc.http_status is None

    def test_status_code_mapping(self):
        """Test HTTP status code to error code mapping."""
        test_cases = [
            (401, KadoaErrorCode.AUTH_ERROR),
            (403, KadoaErrorCode.AUTH_ERROR),
            (404, KadoaErrorCode.NOT_FOUND),
            (408, KadoaErrorCode.TIMEOUT),
            (429, KadoaErrorCode.RATE_LIMITED),
            (400, KadoaErrorCode.VALIDATION_ERROR),
            (422, KadoaErrorCode.VALIDATION_ERROR),
            (500, KadoaErrorCode.HTTP_ERROR),
            (502, KadoaErrorCode.HTTP_ERROR),
            (503, KadoaErrorCode.HTTP_ERROR),
        ]

        for status, expected_code in test_cases:
            code = KadoaHttpException._map_status_to_code(None, status)
            assert code == expected_code, f"Status {status} should map to {expected_code}"

    def test_to_dict(self):
        """Test converting exception to dictionary."""
        exc = KadoaHttpException(
            "Test error",
            http_status=500,
            request_id="req-123",
            endpoint="/test",
            method="POST",
            response_body={"error": "Internal"},
            details={"key": "value"},
        )

        result = exc.to_dict()

        assert result["name"] == "KadoaHttpException"
        assert result["message"] == "Test error"
        assert result["httpStatus"] == 500
        assert result["requestId"] == "req-123"
        assert result["endpoint"] == "/test"
        assert result["method"] == "POST"
        assert result["responseBody"] == {"error": "Internal"}
        assert result["details"] == {"key": "value"}


class TestWrapKadoaError:
    """Test wrap_kadoa_error function."""

    def test_wraps_generic_exception(self):
        """Test wrapping generic exception."""
        error = ValueError("Invalid value")
        wrapped = wrap_kadoa_error(error, "Operation failed")

        assert isinstance(wrapped, KadoaSdkException)
        assert "Operation failed: Invalid value" in wrapped.message
        assert wrapped.code == KadoaErrorCode.INTERNAL_ERROR

    def test_wraps_requests_exception(self):
        """Test wrapping requests exception."""
        error = requests.RequestException("Network error")
        wrapped = wrap_kadoa_error(error, "Request failed")

        assert isinstance(wrapped, KadoaHttpException)
        assert "Request failed" in wrapped.message

    def test_preserves_kadoa_exception(self):
        """Test that it preserves existing Kadoa exceptions."""
        original = KadoaSdkException("Original error", code=KadoaErrorCode.AUTH_ERROR)
        wrapped = wrap_kadoa_error(original, "Enhanced", {"extra": "data"})

        assert wrapped is original  # Same object
        assert "Enhanced: Original error" in wrapped.message
        assert wrapped.details["extra"] == "data"


class TestHelperFunctions:
    """Test helper functions."""

    def test_is_kadoa_sdk_exception(self):
        """Test is_kadoa_sdk_exception function."""
        sdk_exc = KadoaSdkException("Test")
        http_exc = KadoaHttpException("Test")
        other_exc = ValueError("Test")

        assert is_kadoa_sdk_exception(sdk_exc) is True
        assert (
            is_kadoa_sdk_exception(http_exc) is True
        )  # KadoaHttpException extends KadoaSdkException
        assert is_kadoa_sdk_exception(other_exc) is False

    def test_is_kadoa_http_exception(self):
        """Test is_kadoa_http_exception function."""
        sdk_exc = KadoaSdkException("Test")
        http_exc = KadoaHttpException("Test")
        other_exc = ValueError("Test")

        assert is_kadoa_http_exception(sdk_exc) is False
        assert is_kadoa_http_exception(http_exc) is True
        assert is_kadoa_http_exception(other_exc) is False
