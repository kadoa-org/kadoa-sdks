"""
E2E tests for extraction functionality.
"""

import logging
import os

import pytest

from kadoa_sdk import ExtractionOptions, KadoaSdkConfig, initialize_sdk, run_extraction


@pytest.mark.e2e
class TestExtraction:
    """E2E tests for extraction functionality."""

    @pytest.fixture(scope="class")
    def sdk(self):
        """Initialize sdk for all tests in this class."""
        test_api_key = os.environ.get("KADOA_API_KEY", "39113751-1e7a-4cb2-9516-1e25d0085aa5")
        test_base_url = os.environ.get("KADOA_BASE_URL", "http://localhost:12380")

        sdk = initialize_sdk(
            KadoaSdkConfig(api_key=test_api_key, base_url=test_base_url, timeout=30)
        )
        logger = logging.getLogger("kadoa_sdk.events")
        sdk.on_event(lambda event: logger.info("event: %s", event.to_dict()))
        return sdk

    @pytest.mark.integration
    @pytest.mark.timeout(600)
    def test_extraction_with_valid_url(self, sdk):
        """Test extraction runs successfully with valid URL."""
        options = ExtractionOptions(
            urls=["https://sandbox.kadoa.com/careers"],
        )

        result = run_extraction(sdk, options)

        assert result is not None
        assert result.workflow_id is not None
        assert isinstance(result.workflow_id, str)
        assert len(result.workflow_id) > 0
