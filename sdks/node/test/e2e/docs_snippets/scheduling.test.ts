/**
 * TS-SCHEDULING: scheduling.mdx snippets
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient } from "../../../src/kadoa-client";
import { getTestEnv } from "../../utils/env";
import { seedWorkflow } from "../../utils/seeder";

describe("TS-SCHEDULING: scheduling.mdx snippets", () => {
  const readinessTimeoutMs = 60 * 60 * 1000;
  let client: KadoaClient;
  let workflowId: string;
  const workflowIds = new Set<string>();

  beforeAll(async () => {
    client = new KadoaClient({ apiKey: getTestEnv().KADOA_API_KEY });
    const createWorkflow = client.workflow.create.bind(client.workflow);
    client.workflow.create = (async (input) => {
      const workflow = await createWorkflow(input);
      workflowIds.add(workflow.id);
      return workflow;
    }) as typeof client.workflow.create;
    ({ workflowId } = await seedWorkflow(
      { name: `docs-scheduling-${Date.now()}` },
      client,
    ));
  });

  afterAll(async () => {
    try {
      const results = await Promise.allSettled(
        [...workflowIds].map((id) => client.workflow.delete(id)),
      );
      const failures = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      if (failures.length > 0) {
        throw new AggregateError(
          failures.map((failure) => failure.reason),
          "Failed to delete one or more workflow fixtures",
        );
      }
    } finally {
      client?.dispose?.();
    }
  });

  test("TS-SCHEDULING-001: create a scheduled extraction", async () => {
    // @docs-preamble TS-SCHEDULING-001
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // @docs-preamble-end TS-SCHEDULING-001

    // @docs-start TS-SCHEDULING-001
    const workflow = await client
      .extract({
        urls: ["https://sandbox.kadoa.com/ecommerce/pagination"],
        name: "Scheduled Extraction",
        extraction: (builder) =>
          builder.entity("Product").field("title", "Product name", "STRING", {
            example: "Sample Product",
          }),
      })
      .setInterval({
        schedules: ["0 9 * * MON-FRI", "0 18 * * MON-FRI"],
      })
      .create();

    console.log("Scheduled workflow:", workflow.workflowId);
    // @docs-end TS-SCHEDULING-001

    workflowIds.add(workflow.workflowId);
    expect(workflow.workflowId).toBeDefined();
    await client.workflow.delete(workflow.workflowId);
    workflowIds.delete(workflow.workflowId);
  });

  test(
    "TS-SCHEDULING-002: run an existing workflow",
    async () => {
      let deadline = Date.now() + readinessTimeoutMs;
      let seededWorkflow = await client.workflow.get(workflowId);
      while (
        ["RUNNING", "VALIDATING"].includes(seededWorkflow.displayState ?? "") &&
        Date.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 10_000));
        seededWorkflow = await client.workflow.get(workflowId);
      }
      if (seededWorkflow.state !== "ACTIVE") {
        await client.workflow.resume(workflowId);
        deadline = Date.now() + readinessTimeoutMs;
      }
      while (
        (seededWorkflow.state !== "ACTIVE" ||
          ["RUNNING", "VALIDATING"].includes(
            seededWorkflow.displayState ?? "",
          )) &&
        Date.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 10_000));
        seededWorkflow = await client.workflow.get(workflowId);
      }
      expect(seededWorkflow.state).toBe("ACTIVE");
      expect(["RUNNING", "VALIDATING"]).not.toContain(
        seededWorkflow.displayState,
      );

      // @docs-preamble TS-SCHEDULING-002
      // import { KadoaClient } from "@kadoa/node-sdk";
      //
      // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
      // const workflowId = "YOUR_WORKFLOW_ID";
      // @docs-preamble-end TS-SCHEDULING-002

      // @docs-start TS-SCHEDULING-002
      const workflow = await client.workflow.get(workflowId);
      console.log(`Current workflow state: ${workflow.displayState}`);

      const result = await client.workflow.runWorkflow(workflowId, {
        limit: 10,
      });
      console.log(`Workflow scheduled with runId: ${result.jobId}`);
      // @docs-end TS-SCHEDULING-002

      expect(result.jobId).toBeDefined();
    },
    readinessTimeoutMs + 2 * 60 * 1000,
  );

  test("TS-SCHEDULING-003: run and fetch paginated data", async () => {
    // @docs-preamble TS-SCHEDULING-003
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // @docs-preamble-end TS-SCHEDULING-003

    // @docs-start TS-SCHEDULING-003
    const extraction = await client
      .extract({
        urls: ["https://sandbox.kadoa.com/ecommerce/pagination"],
        name: "Paginated Extraction",
        userPrompt: "Extract all products, paginating through all pages",
        extraction: (builder) =>
          builder
            .entity("Product")
            .field("title", "Product name", "STRING", {
              example: "Sennheiser HD 6XX",
            })
            .field("price", "Product price", "MONEY"),
      })
      .create();

    const result = await extraction.run({ limit: 10 });

    const page = await result.fetchData({ page: 1, limit: 5 });
    console.log("Page data:", page.data);
    console.log("Pagination:", page.pagination);

    const allData = await result.fetchAllData({});
    console.log("All data:", allData);
    // @docs-end TS-SCHEDULING-003

    workflowIds.add(extraction.workflowId);
    expect(page.data).toBeDefined();
    expect(allData).toBeDefined();
    await client.workflow.delete(extraction.workflowId);
    workflowIds.delete(extraction.workflowId);
  });

  test("TS-SCHEDULING-004: set a manual location", async () => {
    // @docs-preamble TS-SCHEDULING-004
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // @docs-preamble-end TS-SCHEDULING-004

    // @docs-start TS-SCHEDULING-004
    const workflow = await client
      .extract({
        urls: ["https://sandbox.kadoa.com/magic"],
        name: "Geo-located Extraction",
        extraction: (builder) =>
          builder
            .entity("Product")
            .field("title", "Title", "STRING", { example: "Example" }),
      })
      .setLocation({
        type: "manual",
        isoCode: "US",
      })
      .create();
    // @docs-end TS-SCHEDULING-004

    workflowIds.add(workflow.workflowId);
    expect(workflow.workflowId).toBeDefined();
    await client.workflow.delete(workflow.workflowId);
    workflowIds.delete(workflow.workflowId);
  });

  test("TS-SCHEDULING-005: bypass preview", async () => {
    // @docs-preamble TS-SCHEDULING-005
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // @docs-preamble-end TS-SCHEDULING-005

    // @docs-start TS-SCHEDULING-005
    const workflow = await client
      .extract({
        urls: ["https://sandbox.kadoa.com/magic"],
        name: "Direct Activation",
        extraction: (builder) =>
          builder
            .entity("Product")
            .field("title", "Title", "STRING", { example: "Example" }),
      })
      .bypassPreview()
      .create();
    // @docs-end TS-SCHEDULING-005

    workflowIds.add(workflow.workflowId);
    expect(workflow.workflowId).toBeDefined();
    await client.workflow.delete(workflow.workflowId);
    workflowIds.delete(workflow.workflowId);
  });
});
