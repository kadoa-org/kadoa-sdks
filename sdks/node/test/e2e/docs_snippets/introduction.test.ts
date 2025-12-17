/**
 * TS-INTRODUCTION: introduction.mdx snippets
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { KadoaClient } from "../../../src/kadoa-client";
import { deleteWorkflowByName } from "../../utils/cleanup-helpers";
import { getTestEnv } from "../../utils/env";

describe("TS-INTRODUCTION: introduction.mdx snippets", () => {
  let client: KadoaClient;

  beforeAll(() => {
    client = new KadoaClient({ apiKey: getTestEnv().KADOA_API_KEY });
  });

  afterAll(() => {
    client.dispose?.();
  });

  it(
    "TS-INTRODUCTION-001: Quick start - client init + extraction.run",
    async () => {
      const workflowName = "My First Extraction";
      await deleteWorkflowByName(workflowName, client);

      // @docs-preamble TS-INTRODUCTION-001
      // import { KadoaClient } from '@kadoa/node-sdk';
      //
      // const client = new KadoaClient({
      //   apiKey: 'your-api-key'
      // });
      // @docs-preamble-end TS-INTRODUCTION-001

      // @docs-start TS-INTRODUCTION-001
      const result = await client.extraction.run({
        urls: ["https://sandbox.kadoa.com/ecommerce"],
        name: "My First Extraction",
        limit: 10,
      });

      console.log(result.data);
      // @docs-end TS-INTRODUCTION-001

      expect(result).toBeDefined();
      expect(result.workflowId).toBeDefined();
      if (result.workflowId) await client.workflow.delete(result.workflowId);
    },
    { timeout: 120000 },
  );

  it(
    "TS-INTRODUCTION-002: Builder pattern - extract().create().run()",
    async () => {
      const workflowName = "Product Monitor";
      await deleteWorkflowByName(workflowName, client);

      // @docs-start TS-INTRODUCTION-002
      const workflow = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: "Product Monitor",
          extraction: (builder) =>
            builder
              .entity("Product")
              .field("name", "Product name", "STRING", {
                example: "MacBook Pro",
              })
              .field("price", "Price in USD", "MONEY")
              .field("inStock", "Is available", "BOOLEAN"),
        })
        .create();

      const result = await workflow.run({ limit: 10 });
      const response = await result.fetchData({});
      console.log(response.data);
      // @docs-end TS-INTRODUCTION-002

      expect(workflow.workflowId).toBeDefined();
      expect(response.data).toBeDefined();

      if (workflow.workflowId)
        await client.workflow.delete(workflow.workflowId);
    },
    { timeout: 300000 },
  );
});
