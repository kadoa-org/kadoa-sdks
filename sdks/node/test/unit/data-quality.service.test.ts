import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";
import type { DataQualityRules } from "../../src/domains/data-quality";

const mockGet = mock();
const mockPut = mock();
const mockDelete = mock();

function createTestClient(): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  const api = client.apis.dataQuality as any;
  api.v4WorkflowsWorkflowIdSchemaValidationRulesGet = mockGet;
  api.v4WorkflowsWorkflowIdSchemaValidationRulesPut = mockPut;
  api.v4WorkflowsWorkflowIdSchemaValidationRulesFieldNameDelete = mockDelete;
  return client;
}

const edited = {
  editedBy: "user",
  editedAt: "2026-09-22T10:00:00.000Z",
} as const;

const rules: DataQualityRules = {
  title: {
    kind: "STRING",
    presence: { target: 100, ...edited },
    maxLength: { value: 120, ...edited },
    format: {
      kind: "FREE_TEXT",
      charset: { kind: "PRESET", preset: "natural_language" },
      ...edited,
    },
  },
  price: {
    kind: "NUMBER",
    minimum: { value: 0, ...edited },
    maxDecimalPlaces: { value: 2, ...edited },
  },
  publishedAt: {
    kind: "DATE",
    maximum: { kind: "RELATIVE", preset: "TODAY", ...edited },
  },
  tags: {
    kind: "ARRAY",
    minItems: { value: 1, ...edited },
    items: {
      kind: "STRING",
      format: {
        kind: "LIST",
        source: { kind: "CUSTOM", values: ["new", "sale"] },
        ...edited,
      },
    },
  },
};

beforeEach(() => {
  mockGet.mockReset();
  mockPut.mockReset();
  mockDelete.mockReset();
});

describe("DataQualityService", () => {
  test("getRules returns the per-field rules of a workflow", async () => {
    mockGet.mockResolvedValueOnce({ data: { rules } });

    const result = await createTestClient().dataQuality.getRules("wf-1");

    expect(mockGet).toHaveBeenCalledWith({ workflowId: "wf-1" });
    expect(result).toEqual(rules);
  });

  test("getRules returns null for a workflow without rules", async () => {
    mockGet.mockResolvedValueOnce({ data: { rules: null } });

    const result = await createTestClient().dataQuality.getRules("wf-1");

    expect(result).toBeNull();
  });

  test("upsertRules sends the rules as the request body and returns the merged ruleset", async () => {
    const merged = { ...rules, extra: { kind: "OTHER" } };
    mockPut.mockResolvedValueOnce({ data: { rules: merged } });

    const result = await createTestClient().dataQuality.upsertRules(
      "wf-1",
      rules,
    );

    expect(mockPut).toHaveBeenCalledWith({
      workflowId: "wf-1",
      requestBody: rules,
    });
    expect(result).toEqual(merged);
  });

  test("deleteFieldRules removes one field and returns the remaining ruleset", async () => {
    const { title: _removed, ...remaining } = rules;
    mockDelete.mockResolvedValueOnce({ data: { rules: remaining } });

    const result = await createTestClient().dataQuality.deleteFieldRules(
      "wf-1",
      "title",
    );

    expect(mockDelete).toHaveBeenCalledWith({
      workflowId: "wf-1",
      fieldName: "title",
    });
    expect(result).toEqual(remaining);
  });

  test("propagates API errors", async () => {
    mockPut.mockRejectedValueOnce(new Error("Invalid validation rules"));

    await expect(
      createTestClient().dataQuality.upsertRules("wf-1", rules),
    ).rejects.toThrow("Invalid validation rules");
  });
});
