"""PY-WORKFLOWS: workflows/create.mdx snippets"""

import asyncio
import pytest
from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.extraction.types import ExtractOptions, ExtractionOptions, RunWorkflowOptions
from kadoa_sdk.schemas.schema_builder import FieldOptions
from kadoa_sdk.schemas.schemas_acl import (
    CreateSchemaRequest,
    SchemaField,
    DataField,
    FieldExample,
)
from .conftest import delete_workflow_by_name, delete_schema_by_name


class TestWorkflowsSnippets:

    @pytest.mark.e2e
    def test_workflows_001_authentication(self, client):
        """PY-WORKFLOWS-001: Authentication"""
        # @docs-preamble PY-WORKFLOWS-001
        # import asyncio
        # from kadoa_sdk import KadoaClient, KadoaClientConfig
        #
        # client = KadoaClient(config=KadoaClientConfig(api_key="your-api-key"))
        # @docs-preamble-end PY-WORKFLOWS-001
        # @docs-start PY-WORKFLOWS-001
        status = asyncio.run(client.status())
        print(status)
        print(status.user)
        # @docs-end PY-WORKFLOWS-001

        assert client is not None
        assert status is not None
        assert status.user is not None

    @pytest.mark.e2e
    @pytest.mark.timeout(120)
    def test_workflows_002_auto_detection(self, client):
        """PY-WORKFLOWS-002: Auto-detection extraction"""
        workflow_name = "Auto Product Extraction"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-WORKFLOWS-002
        # SDK: AI automatically detects and extracts data
        result = client.extraction.run(
            ExtractionOptions(
                urls=["https://sandbox.kadoa.com/ecommerce"],
                name="Auto Product Extraction",
                limit=10,
            )
        )

        print(result.data)
        # @docs-end PY-WORKFLOWS-002

        assert result is not None

        # Cleanup
        if result.workflow_id:
            client.workflow.delete(result.workflow_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(300)
    def test_workflows_003_custom_schema(self, client):
        """PY-WORKFLOWS-003: Custom schema extraction"""
        workflow_name = "Structured Product Extraction"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-WORKFLOWS-003
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Structured Product Extraction",
                    extraction=lambda builder: builder.entity("Product")
                    .field("title", "Product name", "STRING", FieldOptions(example="iPhone 15 Pro"))
                    .field("price", "Price in USD", "MONEY")
                    .field("inStock", "Availability", "BOOLEAN")
                    .field("rating", "Rating 1-5", "NUMBER")
                    .field("releaseDate", "Launch date", "DATE"),
                )
            )
            .create()
        )

        result = workflow.run(RunWorkflowOptions(limit=10))

        # Use destructuring for cleaner access
        response = result.fetch_data({})
        print(response.data)
        # @docs-end PY-WORKFLOWS-003

        assert workflow.workflow_id is not None
        assert response.data is not None

        # Cleanup
        if workflow.workflow_id:
            client.workflow.delete(workflow.workflow_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(300)
    def test_workflows_004_raw_content(self, client):
        """PY-WORKFLOWS-004: Raw content extraction"""
        workflow_name = "Article Content"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-WORKFLOWS-004
        # Extract as Markdown
        extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/news"],
                    name="Article Content",
                    extraction=lambda builder: builder.raw("MARKDOWN"),
                )
            )
            .create()
        )

        run = extraction.run(RunWorkflowOptions(limit=10))
        data = run.fetch_data({})
        print(data)
        # @docs-end PY-WORKFLOWS-004

        assert extraction.workflow_id is not None
        assert data is not None

        # Cleanup
        if extraction.workflow_id:
            client.workflow.delete(extraction.workflow_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(120)
    def test_workflows_005_classification(self, client):
        """PY-WORKFLOWS-005: Classification extraction"""
        workflow_name = "Article Classifier"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-WORKFLOWS-005
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/news"],
                    name="Article Classifier",
                    extraction=lambda builder: builder.entity("Article")
                    .field(
                        "title",
                        "Headline",
                        "STRING",
                        FieldOptions(example="Tech Company Announces New Product"),
                    )
                    .field(
                        "content",
                        "Article text",
                        "STRING",
                        FieldOptions(example="The article discusses the latest innovations..."),
                    )
                    .classify(
                        "sentiment",
                        "Content tone",
                        [
                            {"title": "Positive", "definition": "Optimistic tone"},
                            {"title": "Negative", "definition": "Critical tone"},
                            {"title": "Neutral", "definition": "Balanced tone"},
                        ],
                    )
                    .classify(
                        "category",
                        "Article topic",
                        [
                            {"title": "Technology", "definition": "Tech news"},
                            {"title": "Business", "definition": "Business news"},
                            {"title": "Politics", "definition": "Political news"},
                        ],
                    ),
                )
            )
            .create()
        )
        # Note: 'limit' here is limiting number of extracted records not fetched
        result = workflow.run(RunWorkflowOptions(limit=10, variables={}))
        print(result.job_id)
        data = result.fetch_data({"limit": 10})
        print(data)
        # @docs-end PY-WORKFLOWS-005

        assert workflow.workflow_id is not None

        # Cleanup
        if workflow.workflow_id:
            client.workflow.delete(workflow.workflow_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(120)
    def test_workflows_006_single_page(self, client):
        """PY-WORKFLOWS-006: Single page extraction"""
        workflow_name = "Job Posting Monitor"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-WORKFLOWS-006
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/careers-simple"],
                    name="Job Posting Monitor",
                    navigation_mode="single-page",
                    extraction=lambda builder: builder.entity("Job Posting")
                    .field(
                        "jobTitle",
                        "Job title",
                        "STRING",
                        FieldOptions(example="Senior Software Engineer"),
                    )
                    .field(
                        "department",
                        "Department or team",
                        "STRING",
                        FieldOptions(example="Engineering"),
                    )
                    .field(
                        "location",
                        "Job location",
                        "STRING",
                        FieldOptions(example="San Francisco, CA"),
                    ),
                )
            )
            .set_interval({"interval": "DAILY"})
            .create()
        )

        print("Workflow created:", workflow.workflow_id)
        result = workflow.run(RunWorkflowOptions(limit=10, variables={}))
        print(result.job_id)
        # @docs-end PY-WORKFLOWS-006

        assert workflow.workflow_id is not None

        # Cleanup
        if workflow.workflow_id:
            client.workflow.delete(workflow.workflow_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(300)
    def test_workflows_007_list_navigation(self, client):
        """PY-WORKFLOWS-007: List navigation"""
        schema_name = "Test Schema - PY-WORKFLOWS-007"
        workflow_name = "Product Catalog Monitor"
        delete_schema_by_name(client, schema_name)
        delete_workflow_by_name(client, workflow_name)

        # Setup: create schema first
        schema = (
            client.schema.builder("Product")
            .field("title", "Product name", "STRING", FieldOptions(example="Sample Product"))
            .create(schema_name)
        )

        # @docs-start PY-WORKFLOWS-007
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Product Catalog Monitor",
                    navigation_mode="paginated-page",
                    extraction=lambda _: {"schemaId": schema.id},
                )
            )
            .set_interval({"interval": "HOURLY"})
            .create()
        )

        # Run the workflow
        result = workflow.run(RunWorkflowOptions(limit=10))
        response = result.fetch_data({})
        print("Extracted items:", response.data)
        # @docs-end PY-WORKFLOWS-007

        assert workflow.workflow_id is not None
        assert response.data is not None

        # Cleanup
        if workflow.workflow_id:
            client.workflow.delete(workflow.workflow_id)
        if schema.id:
            client.schema.delete_schema(schema.id)

    @pytest.mark.e2e
    @pytest.mark.timeout(300)
    @pytest.mark.skip(reason="page-and-detail navigation times out in CI")
    def test_workflows_008_list_details(self, client):
        """PY-WORKFLOWS-008: List + details navigation"""
        workflow_name = "Product Details Extractor"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-WORKFLOWS-008
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Product Details Extractor",
                    navigation_mode="page-and-detail",
                    extraction=lambda builder: builder.entity("Product")
                    .field(
                        "title",
                        "Product name",
                        "STRING",
                        FieldOptions(example="Wireless Headphones"),
                    )
                    .field("price", "Product price", "MONEY")
                    .field(
                        "description",
                        "Full description",
                        "STRING",
                        FieldOptions(example="Premium noise-cancelling headphones..."),
                    )
                    .field(
                        "specifications",
                        "Technical specs",
                        "STRING",
                        FieldOptions(example="Battery life: 30 hours, Bluetooth 5.0..."),
                    ),
                )
            )
            .create()
        )

        result = workflow.run(RunWorkflowOptions(limit=10))
        product_details = result.fetch_data({})
        print(product_details.data)
        # @docs-end PY-WORKFLOWS-008

        assert workflow.workflow_id is not None
        assert product_details.data is not None

        # Cleanup
        if workflow.workflow_id:
            client.workflow.delete(workflow.workflow_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(300)
    @pytest.mark.skip(reason="paginated-page navigation times out in CI")
    def test_workflows_009_all_pages(self, client):
        """PY-WORKFLOWS-009: All pages crawler"""
        workflow_name = "Product Catalog Crawler"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-WORKFLOWS-009
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Product Catalog Crawler",
                    navigation_mode="paginated-page",  # Note: 'all-pages' maps to paginated-page in Python SDK
                    extraction=lambda builder: builder.entity("Product")
                    .field(
                        "title",
                        "Product name",
                        "STRING",
                        FieldOptions(example="Sennheiser HD 6XX"),
                    )
                    .field("price", "Product price", "MONEY")
                    .field(
                        "reviews",
                        "Number of reviews",
                        "STRING",
                        FieldOptions(example="155 reviews"),
                    ),
                )
            )
            .create()
        )

        result = workflow.run(RunWorkflowOptions(limit=10))
        response = result.fetch_data({})
        print(response.data)
        # @docs-end PY-WORKFLOWS-009

        assert workflow.workflow_id is not None
        assert response.data is not None

        # Cleanup
        if workflow.workflow_id:
            client.workflow.delete(workflow.workflow_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(120)
    @pytest.mark.skip(reason="agentic-navigation takes too long, unskip for manual testing")
    def test_workflows_010_ai_navigation_existing_schema(self, client):
        """PY-WORKFLOWS-010: AI navigation with existing schema"""
        schema_name = "Test Schema - PY-WORKFLOWS-010"
        workflow_name = "AI Job Scraper"
        delete_schema_by_name(client, schema_name)
        delete_workflow_by_name(client, workflow_name)

        # Setup: create schema first
        schema = (
            client.schema.builder("Job Posting")
            .field(
                "jobTitle",
                "Job title",
                "STRING",
                FieldOptions(example="Senior Software Engineer"),
            )
            .field(
                "requirements",
                "Job requirements",
                "STRING",
                FieldOptions(example="5+ years experience in software development"),
            )
            .field(
                "benefits",
                "Benefits offered",
                "STRING",
                FieldOptions(example="Health insurance, 401k, remote work"),
            )
            .create(schema_name)
        )

        # @docs-start PY-WORKFLOWS-010
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/careers-directory"],
                    name="AI Job Scraper",
                    navigation_mode="agentic-navigation",
                    extraction=lambda _: {"schemaId": schema.id},
                    user_prompt="""Navigate to the careers section, find all
                       engineering job postings, and extract the job details
                       including requirements and benefits. Make sure to
                       click 'Load More' if present.""",
                )
            )
            .create()
        )

        print(f"Workflow {workflow.workflow_id} started")
        # Note: AI Navigation flows typically take ~1 hour to complete.
        # We recommend using webhooks to receive notifications when finished.
        # Call workflow.submit() or workflow.run() to start the extraction
        # @docs-end PY-WORKFLOWS-010

        assert workflow.workflow_id is not None

        # Cleanup
        if workflow.workflow_id:
            client.workflow.delete(workflow.workflow_id)
        if schema.id:
            client.schema.delete_schema(schema.id)

    @pytest.mark.e2e
    @pytest.mark.timeout(120)
    @pytest.mark.skip(reason="agentic-navigation takes too long, unskip for manual testing")
    def test_workflows_011_ai_navigation_custom_schema(self, client):
        """PY-WORKFLOWS-011: AI navigation with custom schema"""
        workflow_name = "AI Job Scraper with Schema"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-WORKFLOWS-011
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/careers-directory"],
                    name="AI Job Scraper with Schema",
                    navigation_mode="agentic-navigation",
                    extraction=lambda builder: builder.entity("Job Posting")
                    .field(
                        "jobTitle",
                        "Job title",
                        "STRING",
                        FieldOptions(example="Product Manager"),
                    )
                    .field(
                        "description",
                        "Job description",
                        "STRING",
                        FieldOptions(example="Lead product strategy and roadmap..."),
                    )
                    .field(
                        "requirements",
                        "Job requirements",
                        "STRING",
                        FieldOptions(example="5+ years experience in product management"),
                    )
                    .field(
                        "benefits",
                        "Benefits offered",
                        "STRING",
                        FieldOptions(example="Health insurance, 401k, remote work"),
                    ),
                    user_prompt="Navigate to the careers section and extract job details.",
                )
            )
            .create()
        )

        print(f"Workflow {workflow.workflow_id} started")
        # Note: AI Navigation flows typically take ~1 hour to complete.
        # We recommend using webhooks to receive notifications when finished.
        # Call workflow.submit() or workflow.run() to start the extraction
        # @docs-end PY-WORKFLOWS-011

        assert workflow.workflow_id is not None

        # Cleanup
        if workflow.workflow_id:
            client.workflow.delete(workflow.workflow_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(120)
    @pytest.mark.skip(reason="agentic-navigation takes too long, unskip for manual testing")
    def test_workflows_012_ai_navigation_auto_schema(self, client):
        """PY-WORKFLOWS-012: AI navigation with auto-detected schema"""
        workflow_name = "AI Blog Scraper"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-WORKFLOWS-012
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/news"],
                    name="AI Blog Scraper",
                    navigation_mode="agentic-navigation",
                    user_prompt="""Find all blog posts from 2024. For each post,
            extract the title, author, publication date, and content.""",
                )
            )
            .create()
        )

        print(f"Workflow {workflow.workflow_id} started")
        # Note: AI Navigation flows typically take ~1 hour to complete.
        # We recommend using webhooks to receive notifications when finished.
        # Call workflow.submit() or workflow.run() to start the extraction
        # @docs-end PY-WORKFLOWS-012

        assert workflow.workflow_id is not None

        # Cleanup
        if workflow.workflow_id:
            client.workflow.delete(workflow.workflow_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(120)
    @pytest.mark.skip(reason="agentic-navigation takes too long, unskip for manual testing")
    def test_workflows_013_ai_navigation_variables(self, client):
        """PY-WORKFLOWS-013: Using variables in AI navigation"""
        workflow_name = "Dynamic Product Search"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-WORKFLOWS-013
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Dynamic Product Search",
                    navigation_mode="agentic-navigation",
                    user_prompt="""Navigate to search and loop through
            '@productTypes', press search, and extract
            product details for all results.""",
                )
            )
            .create()
        )

        print(f"Workflow {workflow.workflow_id} started")
        # Note: AI Navigation flows typically take ~1 hour to complete.
        # We recommend using webhooks to receive notifications when finished.
        # Call workflow.submit() or workflow.run() to start the extraction
        # @docs-end PY-WORKFLOWS-013

        assert workflow.workflow_id is not None

        # Cleanup
        if workflow.workflow_id:
            client.workflow.delete(workflow.workflow_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(120)
    def test_workflows_014_scheduling(self, client):
        """PY-WORKFLOWS-014: Scheduling options"""
        workflow_name = "Scheduled Extraction"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-WORKFLOWS-014
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce/pagination"],
                    name="Scheduled Extraction",
                    extraction=lambda builder: builder.entity("Product").field(
                        "title", "Product name", "STRING", FieldOptions(example="Sample")
                    ),
                )
            )
            .set_interval({"schedules": ["0 9 * * MON-FRI", "0 18 * * MON-FRI"]})
            .create()
        )

        # Workflow runs automatically on schedule
        print("Scheduled workflow:", workflow.workflow_id)
        # @docs-end PY-WORKFLOWS-014

        assert workflow.workflow_id is not None

        # Cleanup
        if workflow.workflow_id:
            client.workflow.delete(workflow.workflow_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(120)
    def test_workflows_015_manual_execution(self, client, fixture_workflow_id):
        """PY-WORKFLOWS-015: Manual execution and status"""
        if not fixture_workflow_id:
            raise ValueError("Fixture workflow not created")

        # @docs-start PY-WORKFLOWS-015
        workflow = client.workflow.get(fixture_workflow_id)
        print(f"Current workflows state: {workflow.display_state}")

        result = client.workflow.run_workflow(
            fixture_workflow_id,
            input=RunWorkflowOptions(limit=10),
        )
        print(f"Workflow scheduled with runId: {result.job_id}")
        # @docs-end PY-WORKFLOWS-015

        assert workflow is not None
        assert workflow.state is not None

    @pytest.mark.e2e
    @pytest.mark.timeout(300)
    def test_workflows_016_pagination(self, client):
        """PY-WORKFLOWS-016: Pagination handling"""
        workflow_name = "Paginated Extraction"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-WORKFLOWS-016
        extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce/pagination"],
                    name="Paginated Extraction",
                    navigation_mode="paginated-page",
                    extraction=lambda builder: builder.entity("Product")
                    .field(
                        "title",
                        "Product name",
                        "STRING",
                        FieldOptions(example="Sennheiser HD 6XX"),
                    )
                    .field("price", "Product price", "MONEY"),
                )
            )
            .create()
        )

        result = extraction.run(RunWorkflowOptions(limit=10))

        # Fetch a single page with pagination info
        page = result.fetch_data({"page": 1, "limit": 5})
        print("Page data:", page.data)
        print("Pagination:", page.pagination)

        # Or get all data at once
        all_data = result.fetch_all_data({})
        print("All data:", all_data)
        # @docs-end PY-WORKFLOWS-016

        assert extraction.workflow_id is not None
        assert page.data is not None
        assert all_data is not None

        # Cleanup
        if extraction.workflow_id:
            client.workflow.delete(extraction.workflow_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(120)
    def test_workflows_017_proxy_locations(self, client):
        """PY-WORKFLOWS-017: Proxy locations"""
        workflow_name = "Geo-located Extraction"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-WORKFLOWS-017
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/magic"],
                    name="Geo-located Extraction",
                    extraction=lambda builder: builder.entity("Product").field(
                        "title", "Title", "STRING", FieldOptions(example="example")
                    ),
                )
            )
            .set_location({"type": "manual", "isoCode": "US"})
            .create()
        )
        # @docs-end PY-WORKFLOWS-017

        assert workflow.workflow_id is not None

        # Cleanup
        if workflow.workflow_id:
            client.workflow.delete(workflow.workflow_id)

    @pytest.mark.e2e
    @pytest.mark.timeout(120)
    def test_workflows_018_bypass_preview(self, client):
        """PY-WORKFLOWS-018: Preview mode bypass"""
        workflow_name = "Direct Activation"
        delete_workflow_by_name(client, workflow_name)

        # @docs-start PY-WORKFLOWS-018
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/magic"],
                    name="Direct Activation",
                    extraction=lambda builder: builder.entity("Product").field(
                        "title", "Title", "STRING", FieldOptions(example="example")
                    ),
                )
            )
            .bypass_preview()  # Skip review step
            .create()
        )

        # Workflow is immediately active
        # @docs-end PY-WORKFLOWS-018

        assert workflow.workflow_id is not None

        # Cleanup
        if workflow.workflow_id:
            client.workflow.delete(workflow.workflow_id)
