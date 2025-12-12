"""E2E tests for crawler session service."""

import time

import pytest
import pytest_asyncio

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.crawler import StartCrawlRequest


@pytest.mark.e2e
class TestCrawlerSession:
    """E2E tests for crawler session functionality."""

    created_session_ids: list[str] = []

    @pytest_asyncio.fixture(scope="class")
    async def client(self):
        """Initialize client for all tests in this class."""
        TestCrawlerSession.created_session_ids.clear()

        settings = get_settings()
        client = KadoaClient(
            KadoaClientConfig(
                api_key=settings.api_key,
                timeout=30,
            )
        )

        yield client

        for session_id in TestCrawlerSession.created_session_ids:
            try:
                client.crawler.session.pause(session_id)
            except Exception:
                pass

        client.dispose()

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_start_crawler_session(self, client):
        """Should start a crawler session."""
        session = client.crawler.session.start(
            StartCrawlRequest(
                url="https://sandbox.kadoa.com/careers",
                max_depth=2,
                max_pages=5,
            )
        )

        assert session is not None
        assert session.session_id is not None

        TestCrawlerSession.created_session_ids.append(session.session_id)

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_list_crawler_sessions(self, client):
        """Should list crawler sessions."""
        sessions = client.crawler.session.list_sessions()

        assert sessions is not None
        assert isinstance(sessions, list)

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_get_session_pages(self, client):
        """Should get session pages."""
        session = client.crawler.session.start(
            StartCrawlRequest(
                url="https://sandbox.kadoa.com/careers",
                max_depth=1,
                max_pages=3,
            )
        )
        TestCrawlerSession.created_session_ids.append(session.session_id)

        # wait for crawl to start
        time.sleep(2)

        pages = client.crawler.session.get_pages(session.session_id)

        assert pages is not None
        assert pages.payload is not None

    @pytest.mark.integration
    @pytest.mark.timeout(60)
    def test_pause_and_resume_session(self, client):
        """Should pause and resume a session."""
        session = client.crawler.session.start(
            StartCrawlRequest(
                url="https://sandbox.kadoa.com/careers",
                max_depth=2,
                max_pages=10,
            )
        )
        TestCrawlerSession.created_session_ids.append(session.session_id)

        pause_result = client.crawler.session.pause(session.session_id)
        assert pause_result is not None

        resume_result = client.crawler.session.resume(session.session_id)
        assert resume_result is not None
