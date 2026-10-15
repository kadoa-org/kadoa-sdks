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
  test("preserves customer dataset properties named runCost and runCosts", async () => {
    const payload = {
      workflowId: "wf-test",
      data: [
        {
          runCost: 17,
          runCosts: 23,
          nested: { runCost: 31, runCosts: [{ runCost: 41, runCosts: 47 }] },
          value: "ordinary customer value",
        },
      ],
      pagination: { page: 1, limit: 100, total: 1 },
    };
    const client = createTestClient(payload);

    const result = await client.extraction.fetchData({ workflowId: "wf-test" });

    expect(result).toEqual(payload);
  });

  test("omits SECRET variable values without placeholders and preserves ordinary values", async () => {
    const payload = {
      variables: [
        { id: "secret", dataType: "SECRET", value: "private-token" },
        { id: "string", dataType: "STRING", value: "public text" },
        { id: "number", dataType: "NUMBER", value: 42 },
        { id: "boolean", dataType: "BOOLEAN", value: false },
      ],
    };
    const client = createTestClient(payload);

    const result = await client.variable.list();

    expect(result).toEqual([
      { id: "secret", dataType: "SECRET" },
      ...payload.variables.slice(1),
    ]);
    expect(result[0]).not.toHaveProperty("value");
    expect(payload.variables[0].value).toBe("private-token");
  });

  test("omits SECRET values recursively through objects and arrays", async () => {
    const payload = {
      variable: {
        id: "nested",
        dataType: "JSON",
        value: {
          nested: [
            { dataType: "SECRET", value: "private-token", runCosts: 53 },
            { dataType: "STRING", value: "public text", runCost: 59 },
          ],
          empty: null,
        },
      },
    };
    const client = createTestClient(payload);

    const result = await client.variable.get("nested");

    expect(result).toEqual({
      id: "nested",
      dataType: "JSON",
      value: {
        nested: [
          { dataType: "SECRET", runCosts: 53 },
          { dataType: "STRING", value: "public text", runCost: 59 },
        ],
        empty: null,
      },
    });
  });
});
