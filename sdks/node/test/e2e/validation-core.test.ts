import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient } from "../../src/kadoa-client";
import { getTestEnv } from "../utils/env";
import {
  getSharedValidationFixture,
  type SharedValidationFixture,
} from "../utils/shared-fixtures";

describe("Data Validation", () => {
  let client: KadoaClient;
  let fixture: SharedValidationFixture;

  beforeAll(async () => {
    client = new KadoaClient({ apiKey: getTestEnv().KADOA_API_KEY });
    fixture = await getSharedValidationFixture(client);
  }, 120000);

  afterAll(() => client?.dispose());

  test("lists all workflow validations", async () => {
    const result = await client.validation.listWorkflowValidations({
      workflowId: fixture.workflowId,
      jobId: fixture.jobId,
    });

    expect(result?.data.length).toBeGreaterThan(0);
  });

  test("gets validation details by id", async () => {
    const result = await client.validation.getValidationDetails(
      fixture.validationId,
    );

    expect(result?.id).toBe(fixture.validationId);
    expect(result?.workflowId).toBe(fixture.workflowId);
    expect(result?.jobId).toBe(fixture.jobId);
  });

  // Covered by docs_snippets: TS-DATA-VALIDATION-003

  test("gets latest validation by workflowId and jobId", async () => {
    const result = await client.validation.getLatest(
      fixture.workflowId,
      fixture.jobId,
    );

    expect(result?.workflowId).toBe(fixture.workflowId);
    expect(result?.jobId).toBe(fixture.jobId);
  });

  test("gets validation anomalies", async () => {
    const result = await client.validation.getAnomalies(fixture.validationId);

    expect(result?.anomaliesByRule).toBeDefined();
    // Anomalies may be 0 depending on data - verify API returns valid structure
    expect(Array.isArray(result?.anomaliesByRule)).toBe(true);
  });

  test("gets validation anomalies by rule", async () => {
    const result = await client.validation.getAnomaliesByRule(
      fixture.validationId,
      fixture.ruleName,
    );

    expect(result?.ruleName).toBe(fixture.ruleName);
    expect(result?.anomalies).toBeDefined();
    expect(Array.isArray(result?.anomalies)).toBe(true);
  });
});
