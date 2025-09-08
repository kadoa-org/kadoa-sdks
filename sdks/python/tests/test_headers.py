import pytest
from kadoa_sdk import KadoaClient, KadoaClientConfig, __version__
from kadoa_sdk.version import SDK_NAME, SDK_LANGUAGE


class TestSDKHeaders:
    def test_sdk_identification_headers_set(self):
        """Test that SDK identification headers are set correctly."""
        config = KadoaClientConfig(api_key="test-api-key")
        client = KadoaClient(config)

        # Check that default headers are set
        assert "User-Agent" in client._api_client.default_headers
        assert "X-SDK-Version" in client._api_client.default_headers
        assert "X-SDK-Language" in client._api_client.default_headers

        # Check header values
        expected_user_agent = f"{SDK_NAME}/{__version__}"
        assert client._api_client.default_headers["User-Agent"] == expected_user_agent
        assert client._api_client.default_headers["X-SDK-Version"] == __version__
        assert client._api_client.default_headers["X-SDK-Language"] == SDK_LANGUAGE

    def test_sdk_values(self):
        """Test that SDK constants have correct values."""
        assert SDK_NAME == "kadoa-python-sdk"
        assert SDK_LANGUAGE == "python"
        assert __version__ == "0.5.0"  # This should match pyproject.toml

    def test_headers_with_custom_base_url(self):
        """Test that headers are set even with custom base URL."""
        config = KadoaClientConfig(api_key="test-api-key", base_url="https://custom.api.com")
        client = KadoaClient(config)

        # Headers should still be set
        assert "User-Agent" in client._api_client.default_headers
        assert "X-SDK-Version" in client._api_client.default_headers
        assert "X-SDK-Language" in client._api_client.default_headers
