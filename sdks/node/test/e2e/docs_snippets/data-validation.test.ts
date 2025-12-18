/**
 * TS-DATA-VALIDATION: data-validation.mdx snippets
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { KadoaClient } from "../../../src/kadoa-client";
import { deletePreviewRules } from "../../utils/cleanup-helpers";
import { getTestEnv } from "../../utils/env";
import { getSharedValidationFixture } from "../../utils/shared-fixtures";

describe("TS-DATA-VALIDATION: data-validation.mdx snippets", () => {
  let client: KadoaClient;
  let workflowId: string;
  let jobId: string;
  let columns: string[];

  beforeAll(async () => {
    client = new KadoaClient({ apiKey: getTestEnv().KADOA_API_KEY });
    const fixture = await getSharedValidationFixture(client);
    workflowId = fixture.workflowId;
    jobId = fixture.jobId;
    columns = fixture.columns;
  }, 120000);

  afterAll(async () => {
    if (workflowId) await deletePreviewRules(workflowId, client);
    client?.dispose?.();
  });

  it(
    "TS-DATA-VALIDATION-001: Generate validation rules",
    async () => {
      if (!workflowId) throw new Error("Fixture workflow not created");
      if (columns.length < 2) throw new Error("Need at least 2 columns");

      // @docs-start TS-DATA-VALIDATION-001
      // Analyzes your schema and recent data to suggest validation rules
      // Rules are created in 'preview' status for review before enabling
      // Note: Requires a workflow with completed extraction data
      await client.validation.rules.generateRules({
        workflowId,
      });

      // Generate rule with natural language
      // Uses columns from the seeded workflow schema
      await client.validation.rules.generateRule({
        workflowId,
        selectedColumns: columns.slice(0, 2),
        userPrompt: "Not null values",
      });

      // @docs-end TS-DATA-VALIDATION-001

      expect(true).toBe(true);
    },
    { timeout: 60000 },
  );

  it("TS-DATA-VALIDATION-002: List/bulk approve/update rules", async () => {
    if (!workflowId) throw new Error("Fixture workflow not created");

    // @docs-start TS-DATA-VALIDATION-002
    // List rules
    const rules = await client.validation.rules.listRules({
      workflowId,
      status: "preview",
    });

    console.log("Rules:", rules);
    // @docs-end TS-DATA-VALIDATION-002

    expect(rules).toBeDefined();
  });

  it("TS-DATA-VALIDATION-003: Run validation", async () => {
    if (!workflowId) throw new Error("Fixture workflow not created");

    // @docs-start TS-DATA-VALIDATION-003
    // Schedule validation for a workflow job
    const response = await client.validation.schedule(workflowId, jobId);

    await client.validation.waitUntilCompleted(response.validationId);

    const validation = await client.validation.getLatest(workflowId);

    const anomalies = await client.validation.getAnomalies(
      response.validationId,
    );
    console.log("Validation:", validation);
    console.log("Anomalies:", anomalies);

    // @docs-end TS-DATA-VALIDATION-003

    expect(true).toBe(true);
  });
});
