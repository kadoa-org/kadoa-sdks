/**
 * TS-DATA-QUALITY: sdk/data-quality/overview.mdx snippets
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient } from "../../../src/kadoa-client";
import { getTestEnv } from "../../utils/env";
import { seedWorkflow } from "../../utils/seeder";

describe("TS-DATA-QUALITY: sdk/data-quality/overview.mdx snippets", () => {
  let client: KadoaClient;
  let workflowId: string;

  beforeAll(async () => {
    client = new KadoaClient({ apiKey: getTestEnv().KADOA_API_KEY });
    const seeded = await seedWorkflow(
      { name: `docs-data-quality-${Date.now()}` },
      client,
    );
    workflowId = seeded.workflowId;
  }, 120000);

  afterAll(async () => {
    try {
      if (workflowId) await client.workflow.delete(workflowId);
    } finally {
      client?.dispose?.();
    }
  });

  test("TS-DATA-QUALITY-001: set rules for fields", async () => {
    // @docs-preamble TS-DATA-QUALITY-001
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const workflowId = "WORKFLOW_ID";
    // @docs-preamble-end TS-DATA-QUALITY-001

    // @docs-start TS-DATA-QUALITY-001
    // Every rule records who set it and when
    const edited = {
      editedBy: "user",
      editedAt: new Date().toISOString(),
    } as const;

    const rules = await client.dataQuality.upsertRules(workflowId, {
      title: {
        kind: "STRING",
        presence: { target: 100, ...edited },
        maxLength: { value: 120, ...edited },
      },
      link: {
        kind: "STRING",
        format: {
          kind: "FORMAT",
          source: { kind: "PRESET", preset: "url" },
          ...edited,
        },
      },
    });

    console.log(Object.keys(rules)); // ["title", "link"]
    // @docs-end TS-DATA-QUALITY-001

    expect(rules.title?.kind).toBe("STRING");
    expect(rules.link?.kind).toBe("STRING");
  });

  test("TS-DATA-QUALITY-002: read the rules of a workflow", async () => {
    // @docs-preamble TS-DATA-QUALITY-002
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const workflowId = "WORKFLOW_ID";
    // @docs-preamble-end TS-DATA-QUALITY-002

    // @docs-start TS-DATA-QUALITY-002
    // null when the workflow has no rules
    const rules = await client.dataQuality.getRules(workflowId);

    for (const [field, fieldRules] of Object.entries(rules ?? {})) {
      console.log(field, fieldRules.kind, fieldRules.presence?.target);
    }
    // @docs-end TS-DATA-QUALITY-002

    expect(rules?.title?.presence?.target).toBe(100);
  });

  test("TS-DATA-QUALITY-003: remove the rules of one field", async () => {
    // @docs-preamble TS-DATA-QUALITY-003
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const workflowId = "WORKFLOW_ID";
    // @docs-preamble-end TS-DATA-QUALITY-003

    // @docs-start TS-DATA-QUALITY-003
    // Other fields keep their rules
    const remaining = await client.dataQuality.deleteFieldRules(
      workflowId,
      "link",
    );

    console.log(Object.keys(remaining)); // ["title"]
    // @docs-end TS-DATA-QUALITY-003

    expect(remaining.link).toBeUndefined();
    expect(remaining.title?.kind).toBe("STRING");
  });
});
