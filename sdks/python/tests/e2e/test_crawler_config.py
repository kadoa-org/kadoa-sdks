"""E2E tests for crawler config service."""

import pytest
import pytest_asyncio

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.crawler import CreateConfigRequest


@pytest.mark.e2e
class TestCrawlerConfig:
    """E2E tests for crawler config functionality."""

    created_config_ids: list[str] = []

    @pytest_asyncio.fixture(scope="class")
    async def client(self):
        """Initialize client for all tests in this class."""
        TestCrawlerConfig.created_config_ids.clear()

        settings = get_settings()
        client = KadoaClient(
            KadoaClientConfig(
                api_key=settings.api_key,
                timeout=30,
            )
        )

        yield client

        for config_id in TestCrawlerConfig.created_config_ids:
            try:
                client.crawler.config.delete_config(config_id)
            except Exception:
                pass

        client.dispose()

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_create_crawler_config(self, client):
        """Should create a crawler config."""
        config = client.crawler.config.create_config(
            CreateConfigRequest(
                url="https://sandbox.kadoa.com/careers",
                max_depth=2,
                max_pages=10,
            )
        )

        assert config is not None
        assert config.config_id is not None
        assert config.user_id is not None
        assert config.created_at is not None

        TestCrawlerConfig.created_config_ids.append(config.config_id)

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_get_crawler_config_by_id(self, client):
        """Should retrieve existing crawler config by ID."""
        created = client.crawler.config.create_config(
            CreateConfigRequest(
                url="https://sandbox.kadoa.com/careers",
                max_depth=2,
            )
        )
        TestCrawlerConfig.created_config_ids.append(created.config_id)

        retrieved = client.crawler.config.get_config(created.config_id)

        assert retrieved is not None
        assert retrieved.config_id == created.config_id

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_delete_crawler_config(self, client):
        """Should delete a crawler config."""
        created = client.crawler.config.create_config(
            CreateConfigRequest(
                url="https://sandbox.kadoa.com/careers",
                max_depth=2,
            )
        )

        result = client.crawler.config.delete_config(created.config_id)

        assert result is not None
