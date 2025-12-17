import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient } from "../../src";
import { deleteWorkflowByName } from "../utils/cleanup-helpers";
import { getTestEnv } from "../utils/env";

describe("Extraction Builder", () => {
  let client: KadoaClient;
  const env = getTestEnv();

  beforeAll(async () => {
    client = new KadoaClient({
      apiKey: env.KADOA_API_KEY,
      timeout: 30000,
    });

    const realtime = await client.connectRealtime();
    realtime.onEvent((event) => {
      console.log("event: ", event);
    });
  });

  afterAll(() => {
    client.dispose();
  });

  test(
    "auto-detection (no extraction parameter)",
    async () => {
      const workflowName = `Auto Detection Test ${Date.now()}`;
      await deleteWorkflowByName(workflowName, client);

      const createdExtraction = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: workflowName,
        })
        .withNotifications({
          events: "all",
          channels: {
            WEBSOCKET: true,
          },
        })
        .bypassPreview()
        .setLocation({
          type: "auto",
        })
        .setInterval({
          interval: "ONLY_ONCE",
        })
        .create();

      expect(createdExtraction).toBeDefined();
      expect(createdExtraction?.workflowId).toBeDefined();

      const result = await createdExtraction.run({
        variables: {},
        limit: 5,
      });
      const data = await result.fetchData({
        limit: 5,
      });

      expect(data).toBeDefined();
      expect(data.data.length).toBe(5);

      if (createdExtraction.workflowId)
        await client.workflow.delete(createdExtraction.workflowId);
    },
    { timeout: 700000 },
  );

  test.skip(
    "raw extraction (markdown only)",
    async () => {
      const workflowName = `Raw Markdown Extraction ${Date.now()}`;
      await deleteWorkflowByName(workflowName, client);

      const createdExtraction = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: workflowName,
          extraction: (builder) => builder.raw("MARKDOWN"),
        })
        .bypassPreview()
        .setInterval({
          interval: "ONLY_ONCE",
        })
        .create();

      expect(createdExtraction).toBeDefined();
      expect(createdExtraction?.workflowId).toBeDefined();

      const result = await createdExtraction.run({
        variables: {},
        limit: 1,
      });
      const data = await result.fetchData({
        limit: 1,
      });

      expect(data).toBeDefined();
      expect(data.data.length).toBe(1);
      // Check that we have the raw markdown field
      expect(data.data[0]).toHaveProperty("rawMarkdown");

      if (createdExtraction.workflowId)
        await client.workflow.delete(createdExtraction.workflowId);
    },
    { timeout: 700000 },
  );

  // Covered by docs_snippets: TS-WORKFLOWS-003, TS-INTRODUCTION-002, TS-SCHEMAS-001
  // Covered by docs_snippets: TS-WORKFLOWS-004 (hybrid/raw)
  // Covered by docs_snippets: TS-WORKFLOWS-005 (classification)

  test(
    "extraction builder with additionalData",
    async () => {
      const workflowName = `Extraction Builder Additional Data Test ${Date.now()}`;
      await deleteWorkflowByName(workflowName, client);

      const testData = {
        sourceSystem: "e2e-test",
        metadata: { version: 1, testRun: true },
      };

      const createdExtraction = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: workflowName,
          extraction: (builder) =>
            builder.entity("Product").field("title", "Product name", "STRING", {
              example: "Example Product",
            }),
          additionalData: testData,
        })
        .bypassPreview()
        .setInterval({
          interval: "ONLY_ONCE",
        })
        .create();

      expect(createdExtraction).toBeDefined();
      expect(createdExtraction?.workflowId).toBeDefined();

      // Verify additionalData is persisted
      const workflow = await client.workflow.get(createdExtraction.workflowId);
      expect(workflow.additionalData).toBeDefined();
      expect(workflow.additionalData?.sourceSystem).toBe("e2e-test");
      const metadata = workflow.additionalData?.metadata as
        | { version?: number; testRun?: boolean }
        | undefined;
      expect(metadata?.version).toBe(1);
      expect(metadata?.testRun).toBe(true);

      if (createdExtraction.workflowId)
        await client.workflow.delete(createdExtraction.workflowId);
    },
    { timeout: 60000 },
  );
});
