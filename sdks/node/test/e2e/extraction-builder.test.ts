import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient } from "../../src";
import { getE2ETestEnv } from "../utils/env";

describe("Extraction Builder", () => {
  let client: KadoaClient;
  const env = getE2ETestEnv();

  beforeAll(() => {
    client = new KadoaClient({
      apiKey: env.KADOA_API_KEY,
      timeout: 30000,
      enableRealtime: true,
    });

    client.realtime?.onEvent((event) => {
      console.log("event: ", event);
    });
  });

  afterAll(() => {
    client.dispose();
  });

  test(
    "auto-detection (no extraction parameter)",
    async () => {
      const createdExtraction = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: "Auto Detection Test",
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
    },
    { timeout: 700000 },
  );

  test(
    "raw extraction (markdown only)",
    async () => {
      const createdExtraction = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: "Raw Markdown Extraction",
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
    },
    { timeout: 700000 },
  );

  test(
    "custom schema with fields",
    async () => {
      const createdExtraction = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: "Custom Schema Test",
          extraction: (builder) =>
            builder
              .entity("Product")
              .field("title", "Product name", "STRING", {
                example: "Example Product",
              })
              .field("price", "Product price", "MONEY"),
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
        limit: 5,
      });
      const data = await result.fetchData({
        limit: 5,
      });

      expect(data).toBeDefined();
      expect(data.data.length).toBe(5);
      // Check that we have the defined fields
      expect(data.data[0]).toHaveProperty("title");
      expect(data.data[0]).toHaveProperty("price");
    },
    { timeout: 700000 },
  );

  test(
    "hybrid extraction (schema + raw content)",
    async () => {
      const createdExtraction = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: "Hybrid Extraction Test",
          extraction: (builder) =>
            builder
              .entity("Product")
              .field("title", "Product name", "STRING", {
                example: "Example Product",
              })
              .field("price", "Product price", "MONEY")
              .raw("HTML"),
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
        limit: 5,
      });
      const data = await result.fetchData({
        limit: 5,
      });

      expect(data).toBeDefined();
      expect(data.data.length).toBe(5);
      // Check that we have both structured fields and raw content
      expect(data.data[0]).toHaveProperty("title");
      expect(data.data[0]).toHaveProperty("price");
      expect(data.data[0]).toHaveProperty("rawHtml");
    },
    { timeout: 700000 },
  );

  test(
    "classification field",
    async () => {
      const createdExtraction = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: "Classification Test",
          extraction: (builder) =>
            builder.classify("category", "Product category", [
              {
                title: "Electronics",
                definition: "Electronic devices and gadgets",
              },
              { title: "Clothing", definition: "Apparel and fashion items" },
              { title: "Other", definition: "Other products" },
            ]),
        })
        .bypassPreview()
        .setInterval({
          interval: "ONLY_ONCE",
        })
        .create();

      expect(createdExtraction).toBeDefined();
      expect(createdExtraction?.workflowId).toBeDefined();

      const result = await createdExtraction.run({
        limit: 5,
        variables: {},
      });
      const data = await result.fetchData({
        limit: 5,
      });

      expect(data).toBeDefined();
      expect(data.data.length).toBe(5);
      // Check that we have the classification field
      expect(data.data[0]).toHaveProperty("category");
    },
    { timeout: 700000 },
  );

  test(
    "extraction builder with additionalData",
    async () => {
      const testData = {
        sourceSystem: "e2e-test",
        metadata: { version: 1, testRun: true },
      };

      const createdExtraction = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: "Extraction Builder Additional Data Test",
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

      try {
        expect(createdExtraction).toBeDefined();
        expect(createdExtraction?.workflowId).toBeDefined();

        // Verify additionalData is persisted
        const workflow = await client.workflow.get(
          createdExtraction.workflowId,
        );
        expect(workflow.additionalData).toBeDefined();
        expect(workflow.additionalData?.sourceSystem).toBe("e2e-test");
        const metadata = workflow.additionalData?.metadata as
          | { version?: number; testRun?: boolean }
          | undefined;
        expect(metadata?.version).toBe(1);
        expect(metadata?.testRun).toBe(true);
      } finally {
        // Cleanup
        await client.workflow.delete(createdExtraction.workflowId);
      }
    },
    { timeout: 60000 },
  );
});
