import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient } from "../../src/kadoa-client";
import { getTestEnv } from "../utils/env";
import { seedWorkflow } from "../utils/seeder";

describe("FetchData", () => {
  let client: KadoaClient;
  const env = getTestEnv();
  let workflowId: string;

  beforeAll(async () => {
    client = new KadoaClient({ apiKey: env.KADOA_API_KEY, timeout: 30000 });

    const result = await seedWorkflow({ name: "test-workflow-1" }, client);
    workflowId = result.workflowId;
  });

  afterAll(() => {
    if (client) {
      client.dispose();
    }
  });

  test(
    "fetches first page of workflow data",
    async () => {
      const result = await client.extraction.fetchData({
        workflowId: workflowId,
        page: 1,
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.workflowId).toBe(workflowId);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.pagination).toBeDefined();

      if (result.pagination) {
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(10);
      }

      console.log(`[Test] Fetched ${result.data.length} items from page 1`);
    },
    { timeout: 60000 },
  );

  test(
    "fetches multiple pages",
    async () => {
      const page1 = await client.extraction.fetchData({
        workflowId: workflowId,
        page: 1,
        limit: 5,
      });

      const page2 = await client.extraction.fetchData({
        workflowId: workflowId,
        page: 2,
        limit: 5,
      });

      expect(page1.pagination?.page).toBe(1);
      expect(page2.pagination?.page).toBe(2);

      if (page1.data.length > 0 && page2.data.length > 0) {
        expect(page1.data[0]).not.toEqual(page2.data[0]);
      }

      console.log(
        `[Test] Fetched page 1: ${page1.data.length} items, page 2: ${page2.data.length} items`,
      );
    },
    { timeout: 60000 },
  );

  test(
    "handles different query parameters",
    async () => {
      const ascResult = await client.extraction.fetchData({
        workflowId: workflowId,
        page: 1,
        limit: 5,
        order: "asc",
      });

      const descResult = await client.extraction.fetchData({
        workflowId: workflowId,
        page: 1,
        limit: 5,
        order: "desc",
      });

      expect(ascResult).toBeDefined();
      expect(descResult).toBeDefined();

      console.log(
        `[Test] Tested different sort orders - ASC: ${ascResult.data.length} items, DESC: ${descResult.data.length} items`,
      );
    },
    { timeout: 60000 },
  );
});
