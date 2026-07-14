"""PY-SCHEDULING: scheduling.mdx snippets."""

import pytest

from kadoa_sdk import ExtractOptions, FieldOptions, RunWorkflowOptions


class TestSchedulingSnippets:
    @pytest.mark.e2e
    def test_scheduling_001_create_scheduled_extraction(self, client) -> None:
        # @docs-preamble PY-SCHEDULING-001
        # from kadoa_sdk import (
        #     ExtractOptions,
        #     FieldOptions,
        #     KadoaClient,
        #     KadoaClientConfig,
        # )
        #
        # client = KadoaClient(config=KadoaClientConfig(api_key="YOUR_API_KEY"))
        # @docs-preamble-end PY-SCHEDULING-001

        # @docs-start PY-SCHEDULING-001
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce/pagination"],
                    name="Scheduled Extraction",
                    extraction=lambda builder: builder.entity("Product").field(
                        "title",
                        "Product name",
                        "STRING",
                        FieldOptions(example="Sample Product"),
                    ),
                )
            )
            .set_interval({"schedules": ["0 9 * * MON-FRI", "0 18 * * MON-FRI"]})
            .create()
        )

        print("Scheduled workflow:", workflow.workflow_id)
        # @docs-end PY-SCHEDULING-001

        assert workflow.workflow_id
        client.workflow.delete(workflow.workflow_id)

    @pytest.mark.e2e
    def test_scheduling_002_run_existing_workflow(self, client, workflow_id: str) -> None:
        client.workflow.wait(workflow_id, timeout_ms=30 * 60 * 1000)
        if client.workflow.get(workflow_id).state != "ACTIVE":
            client.workflow.resume(workflow_id)
            client.workflow.wait(
                workflow_id,
                target_state="ACTIVE",
                timeout_ms=30 * 60 * 1000,
            )

        # @docs-preamble PY-SCHEDULING-002
        # from kadoa_sdk import KadoaClient, KadoaClientConfig, RunWorkflowOptions
        #
        # client = KadoaClient(config=KadoaClientConfig(api_key="YOUR_API_KEY"))
        # workflow_id = "YOUR_WORKFLOW_ID"
        # @docs-preamble-end PY-SCHEDULING-002

        # @docs-start PY-SCHEDULING-002
        workflow = client.workflow.get(workflow_id)
        print(f"Current workflow state: {workflow.display_state}")

        result = client.workflow.run_workflow(
            workflow_id,
            input=RunWorkflowOptions(limit=10),
        )
        print(f"Workflow scheduled with runId: {result.job_id}")
        # @docs-end PY-SCHEDULING-002

        assert result.job_id

    @pytest.mark.e2e
    def test_scheduling_003_run_and_fetch_data(self, client) -> None:
        # @docs-preamble PY-SCHEDULING-003
        # from kadoa_sdk import (
        #     ExtractOptions,
        #     FieldOptions,
        #     KadoaClient,
        #     KadoaClientConfig,
        #     RunWorkflowOptions,
        # )
        #
        # client = KadoaClient(config=KadoaClientConfig(api_key="YOUR_API_KEY"))
        # @docs-preamble-end PY-SCHEDULING-003

        # @docs-start PY-SCHEDULING-003
        extraction = client.extract(
            ExtractOptions(
                urls=["https://sandbox.kadoa.com/ecommerce/pagination"],
                name="Paginated Extraction",
                user_prompt="Extract all products, paginating through all pages",
                extraction=lambda builder: (
                    builder.entity("Product")
                    .field(
                        "title",
                        "Product name",
                        "STRING",
                        FieldOptions(example="Sennheiser HD 6XX"),
                    )
                    .field("price", "Product price", "MONEY")
                ),
            )
        ).create()

        result = extraction.run(RunWorkflowOptions(limit=10))

        page = result.fetch_data({"page": 1, "limit": 5})
        print("Page data:", page.data)
        print("Pagination:", page.pagination)

        all_data = result.fetch_all_data({})
        print("All data:", all_data)
        # @docs-end PY-SCHEDULING-003

        assert page.data is not None
        assert all_data is not None
        client.workflow.delete(extraction.workflow_id)

    @pytest.mark.e2e
    def test_scheduling_004_set_manual_location(self, client) -> None:
        # @docs-preamble PY-SCHEDULING-004
        # from kadoa_sdk import (
        #     ExtractOptions,
        #     FieldOptions,
        #     KadoaClient,
        #     KadoaClientConfig,
        # )
        #
        # client = KadoaClient(config=KadoaClientConfig(api_key="YOUR_API_KEY"))
        # @docs-preamble-end PY-SCHEDULING-004

        # @docs-start PY-SCHEDULING-004
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/magic"],
                    name="Geo-located Extraction",
                    extraction=lambda builder: builder.entity("Product").field(
                        "title",
                        "Title",
                        "STRING",
                        FieldOptions(example="Example"),
                    ),
                )
            )
            .set_location({"type": "manual", "isoCode": "US"})
            .create()
        )
        # @docs-end PY-SCHEDULING-004

        assert workflow.workflow_id
        client.workflow.delete(workflow.workflow_id)

    @pytest.mark.e2e
    def test_scheduling_005_bypass_preview(self, client) -> None:
        # @docs-preamble PY-SCHEDULING-005
        # from kadoa_sdk import (
        #     ExtractOptions,
        #     FieldOptions,
        #     KadoaClient,
        #     KadoaClientConfig,
        # )
        #
        # client = KadoaClient(config=KadoaClientConfig(api_key="YOUR_API_KEY"))
        # @docs-preamble-end PY-SCHEDULING-005

        # @docs-start PY-SCHEDULING-005
        workflow = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/magic"],
                    name="Direct Activation",
                    extraction=lambda builder: builder.entity("Product").field(
                        "title",
                        "Title",
                        "STRING",
                        FieldOptions(example="Example"),
                    ),
                )
            )
            .bypass_preview()
            .create()
        )
        # @docs-end PY-SCHEDULING-005

        assert workflow.workflow_id
        client.workflow.delete(workflow.workflow_id)
