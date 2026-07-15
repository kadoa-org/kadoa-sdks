/**
 * TS-VARIABLES: variables/overview.mdx snippets
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient } from "../../../src/kadoa-client";
import { getTestEnv } from "../../utils/env";

describe("TS-VARIABLES: variables/overview.mdx snippets", () => {
  let client: KadoaClient;
  const variableIds = new Set<string>();

  beforeAll(() => {
    client = new KadoaClient({ apiKey: getTestEnv().KADOA_API_KEY });
  });

  afterAll(async () => {
    try {
      const results = await Promise.allSettled(
        [...variableIds].map((variableId) =>
          client.variable.delete(variableId),
        ),
      );
      const failures = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      if (failures.length > 0) {
        throw new AggregateError(
          failures.map((failure) => failure.reason),
          "Failed to delete one or more variable fixtures",
        );
      }
    } finally {
      client?.dispose?.();
    }
  });

  test("TS-VARIABLES-001: create a variable", async () => {
    // @docs-preamble TS-VARIABLES-001
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // @docs-preamble-end TS-VARIABLES-001

    // @docs-start TS-VARIABLES-001
    const variable = await client.variable.create({
      key: "target_url",
      value: "https://example.com/products",
      dataType: "STRING",
    });

    console.log("Variable created:", variable.id);
    // @docs-end TS-VARIABLES-001

    variableIds.add(variable.id);
    expect(variable.id).toBeDefined();
  });

  test("TS-VARIABLES-002: list variables", async () => {
    // @docs-preamble TS-VARIABLES-002
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // @docs-preamble-end TS-VARIABLES-002

    // @docs-start TS-VARIABLES-002
    const variables = await client.variable.list();

    for (const variable of variables) {
      console.log(`${variable.key}: ${variable.value} (${variable.dataType})`);
    }
    // @docs-end TS-VARIABLES-002

    expect(Array.isArray(variables)).toBe(true);
  });

  test("TS-VARIABLES-003: get a variable", async () => {
    const created = await client.variable.create({
      key: `docs_get_${Date.now()}`,
      value: "example",
      dataType: "STRING",
    });
    variableIds.add(created.id);
    const variableId = created.id;

    // @docs-preamble TS-VARIABLES-003
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const variableId = "YOUR_VARIABLE_ID";
    // @docs-preamble-end TS-VARIABLES-003

    // @docs-start TS-VARIABLES-003
    const variable = await client.variable.get(variableId);

    console.log(variable.key);
    console.log(variable.value);
    console.log(variable.dataType);
    // @docs-end TS-VARIABLES-003

    expect(variable.id).toBe(variableId);
  });

  test("TS-VARIABLES-004: update a variable", async () => {
    const created = await client.variable.create({
      key: `docs_update_${Date.now()}`,
      value: "https://example.com/products",
      dataType: "STRING",
    });
    variableIds.add(created.id);
    const variableId = created.id;

    // @docs-preamble TS-VARIABLES-004
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const variableId = "YOUR_VARIABLE_ID";
    // @docs-preamble-end TS-VARIABLES-004

    // @docs-start TS-VARIABLES-004
    const updated = await client.variable.update(variableId, {
      value: "https://example.com/products/v2",
    });

    console.log("Variable updated:", updated.key);
    // @docs-end TS-VARIABLES-004

    expect(updated.id).toBe(variableId);
  });

  test("TS-VARIABLES-005: delete a variable", async () => {
    const created = await client.variable.create({
      key: `docs_delete_${Date.now()}`,
      value: "example",
      dataType: "STRING",
    });
    variableIds.add(created.id);
    const variableId = created.id;

    // @docs-preamble TS-VARIABLES-005
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const variableId = "YOUR_VARIABLE_ID";
    // @docs-preamble-end TS-VARIABLES-005

    // @docs-start TS-VARIABLES-005
    await client.variable.delete(variableId);
    // @docs-end TS-VARIABLES-005

    await expect(client.variable.get(variableId)).rejects.toThrow();
    variableIds.delete(variableId);
  });
});
