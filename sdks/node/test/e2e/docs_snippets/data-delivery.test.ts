/**
 * TS-DATA-DELIVERY: data-delivery/sdk.mdx snippets
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { KadoaClient } from "../../../src/kadoa-client";
import { deleteWorkflowByName } from "../../utils/cleanup-helpers";
import { getTestEnv } from "../../utils/env";
import { getSharedWorkflowFixture } from "../../utils/shared-fixtures";

describe("TS-DATA-DELIVERY: data-delivery/sdk.mdx snippets", () => {
  let client: KadoaClient;
  let workflowId: string;

  beforeAll(async () => {
    client = new KadoaClient({ apiKey: getTestEnv().KADOA_API_KEY });
    const fixture = await getSharedWorkflowFixture(client);
    workflowId = fixture.workflowId;
  }, 120000);

  afterAll(() => {
    client.dispose?.();
  });

  it(
    "TS-DATA-DELIVERY-001: Basic usage",
    async () => {
      const workflowName = "Product Extraction";
      await deleteWorkflowByName(workflowName, client);

      // @docs-start TS-DATA-DELIVERY-001
      const result = await client.extraction.run({
        urls: ["https://sandbox.kadoa.com/ecommerce"],
        name: "Product Extraction",
      });

      // Data is included in the result
      console.log(result.data); // Array of extracted items
      console.log(result.pagination); // { page, limit, total, totalPages }
      // @docs-end TS-DATA-DELIVERY-001

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();

      if (result.workflowId) await client.workflow.delete(result.workflowId);
    },
    { timeout: 300000 },
  );

  it("TS-DATA-DELIVERY-002: Fetch data simple", async () => {
    if (!workflowId) throw new Error("Fixture workflow not created");

    // @docs-start TS-DATA-DELIVERY-002
    // Simplest way to fetch workflow data
    const data = await client.extraction.fetchData({
      workflowId: workflowId,
    });
    console.log(data.data);
    // @docs-end TS-DATA-DELIVERY-002

    expect(data).toBeDefined();
  });

  it("TS-DATA-DELIVERY-003: Fetch data with options", async () => {
    if (!workflowId) throw new Error("Fixture workflow not created");

    // @docs-start TS-DATA-DELIVERY-003
    const data = await client.extraction.fetchData({
      workflowId: workflowId,
      page: 1,
      limit: 10,
    });

    console.log(data.data); // Array of extracted items
    console.log(data.pagination); // { page, limit, total, totalPages }
    // @docs-end TS-DATA-DELIVERY-003

    expect(data).toBeDefined();
    expect(data.data).toBeDefined();
  });

  it(
    "TS-DATA-DELIVERY-004: Pagination",
    async () => {
      if (!workflowId) throw new Error("Fixture workflow not created");

      // @docs-start TS-DATA-DELIVERY-004
      // Option 1: Iterate page by page
      for await (const page of client.extraction.fetchDataPages({
        workflowId: workflowId,
      })) {
        console.log("Page data:", page.data);
        console.log("Page number:", page.pagination.page);
      }

      // Option 2: Get everything at once
      const allData = await client.extraction.fetchAllData({
        workflowId: workflowId,
      });
      console.log("All data:", allData);
      // @docs-end TS-DATA-DELIVERY-004

      expect(allData).toBeDefined();
    },
    { timeout: 120000 },
  );
});
