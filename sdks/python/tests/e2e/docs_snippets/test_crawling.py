"""PY-CRAWL: crawling.mdx snippets"""

import time

import pytest

from kadoa_sdk.crawler import StartCrawlRequest


class TestCrawlingSnippets:
    """Crawling docs snippets tests."""

    created_session_ids: list[str] = []

    @pytest.fixture(autouse=True)
    def cleanup(self, client):
        """Clean up created sessions after each test class."""
        yield
        for session_id in TestCrawlingSnippets.created_session_ids:
            try:
                client.crawler.session.pause(session_id)
            except Exception:
                pass
        TestCrawlingSnippets.created_session_ids.clear()

    @pytest.mark.e2e
    @pytest.mark.timeout(60)
    def test_crawl_001_start_single_url(self, client):
        """PY-CRAWL-001: Start a crawl with single URL"""
        # @docs-preamble PY-CRAWL-001
        # from kadoa_sdk import KadoaClient, KadoaClientConfig
        #
        # client = KadoaClient(KadoaClientConfig(api_key="YOUR_API_KEY"))
        # @docs-preamble-end PY-CRAWL-001
        # @docs-start PY-CRAWL-001
        result = client.crawler.session.start({
            "url": "https://demo.vercel.store/",
            "maxDepth": 10,
            "maxPages": 50
        })

        print(result.session_id)
        # @docs-end PY-CRAWL-001

        assert result is not None
        assert result.session_id is not None
        TestCrawlingSnippets.created_session_ids.append(result.session_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(60)
    def test_crawl_002_start_multiple_urls(self, client):
        """PY-CRAWL-002: Start a crawl with multiple URLs"""
        # @docs-start PY-CRAWL-002
        result = client.crawler.session.start({
            "startUrls": [
                "https://demo.vercel.store/",
                "https://demo.vercel.store/collections",
                "https://demo.vercel.store/about"
            ],
            "maxDepth": 10,
            "maxPages": 50
        })
        # @docs-end PY-CRAWL-002

        assert result is not None
        assert result.session_id is not None
        TestCrawlingSnippets.created_session_ids.append(result.session_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(60)
    def test_crawl_003_check_status(self, client):
        """PY-CRAWL-003: Check crawl status"""
        # First create a session
        session = client.crawler.session.start(
            StartCrawlRequest(
                url="https://sandbox.kadoa.com/careers",
                max_depth=1,
                max_pages=3,
            )
        )
        TestCrawlingSnippets.created_session_ids.append(session.session_id)

        # Wait for session to be registered
        time.sleep(1)

        session_id = session.session_id
        # @docs-start PY-CRAWL-003
        status = client.crawler.session.get_session_status(session_id)

        print(status.payload["crawledPages"])
        print(status.payload["finished"])
        # @docs-end PY-CRAWL-003

        assert status is not None
        assert status.session_id == session.session_id

    @pytest.mark.e2e
    @pytest.mark.timeout(60)
    @pytest.mark.skip(reason="SDK enum missing 'READY' status - needs fix")
    def test_crawl_004_list_pages(self, client):
        """PY-CRAWL-004: List crawled pages"""
        # First create a session
        session = client.crawler.session.start(
            StartCrawlRequest(
                url="https://sandbox.kadoa.com/careers",
                max_depth=1,
                max_pages=3,
            )
        )
        TestCrawlingSnippets.created_session_ids.append(session.session_id)

        # Wait for crawl to start
        time.sleep(2)

        session_id = session.session_id
        # @docs-start PY-CRAWL-004
        pages = client.crawler.session.get_pages(session_id, {
            "current_page": 1,
            "page_size": 100
        })

        for page in pages.payload:
            print(page["id"], page["url"], page["status"])
        # @docs-end PY-CRAWL-004

        assert pages is not None
        assert pages.payload is not None

    @pytest.mark.e2e
    @pytest.mark.timeout(60)
    @pytest.mark.skip(reason="Requires completed crawl with pages")
    def test_crawl_005_get_page_content(self, client):
        """PY-CRAWL-005: Retrieve page content"""
        session_id = "YOUR_SESSION_ID"
        page_id = "YOUR_PAGE_ID"
        # @docs-start PY-CRAWL-005
        # Get as markdown
        markdown = client.crawler.session.get_page(
            session_id,
            page_id,
            {"format": "markdown"}
        )

        print(markdown.payload)

        # Get as HTML
        html = client.crawler.session.get_page(
            session_id,
            page_id,
            {"format": "html"}
        )
        # @docs-end PY-CRAWL-005

        assert markdown is not None
        assert html is not None
