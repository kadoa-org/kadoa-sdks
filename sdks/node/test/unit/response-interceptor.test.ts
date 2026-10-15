import { describe, expect, mock, test } from "bun:test";
import { KadoaClient } from "../../src/client/kadoa-client";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

function createTestClient(responseData: unknown): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  client.axiosInstance.defaults.adapter = async (config) => ({
    data: responseData,
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  });
  return client;
}

describe("SDK response interception", () => {
  test("preserves customer cost fields and values with SECRET dataType", async () => {
    const payload = {
      workflowId: "wf-test",
      data: [
        {
          runCost: 17,
          runCosts: 23,
          nested: { runCost: 31, runCosts: [{ runCost: 41, runCosts: 47 }] },
          value: "ordinary customer value",
        },
        {
          dataType: "SECRET",
          value: "customer text",
          runCost: 53,
          runCosts: 59,
          nested: [{ dataType: "SECRET", value: "nested customer text" }],
        },
      ],
      pagination: { page: 1, limit: 100, total: 2 },
    };
    const client = createTestClient(payload);

    const result = await client.extraction.fetchData({ workflowId: "wf-test" });

    expect(result).toEqual(payload);
  });

  test("preserves API secret metadata without placeholders and ordinary variable values", async () => {
    const payload = {
      variables: [
        {
          id: "secret",
          key: "API_TOKEN",
          dataType: "SECRET",
          provider: "GOOGLE_SECRET_MANAGER",
          managementMode: "KADOA_MANAGED",
          status: "ACTIVE",
          createdAt: "2026-10-15T00:00:00.000Z",
        },
        { id: "string", dataType: "STRING", value: "public text" },
        { id: "number", dataType: "NUMBER", value: "42" },
        { id: "array", dataType: "ARRAY", value: '["a","b"]' },
        { id: "object", dataType: "OBJECT", value: '{"flag":false}' },
      ],
    };
    const client = createTestClient(payload);

    const result = await client.variable.list();

    expect(result).toEqual(payload.variables);
    expect(result[0]).not.toHaveProperty("value");
  });

  test("preserves a metadata-only SECRET variable detail response", async () => {
    const payload = {
      variable: {
        id: "secret",
        key: "API_TOKEN",
        dataType: "SECRET",
        provider: "GOOGLE_SECRET_MANAGER",
        managementMode: "CUSTOMER_MANAGED",
        status: "ACTIVE",
        currentVersion: "1",
        createdAt: "2026-10-15T00:00:00.000Z",
      },
    };
    const client = createTestClient(payload);

    const result = await client.variable.get("secret");

    expect(result).toEqual(payload.variable);
    expect(result).not.toHaveProperty("value");
  });
});
