import { describe, expect, mock, test } from "bun:test";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";
import type { CreateTemplateVersionRequest } from "../../src/domains/templates";

const TEMPLATE_ID = "11111111-1111-4111-8111-111111111111";

function createTestClient(mockPost: ReturnType<typeof mock>): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  (client.apis.templates as any).v4TemplatesTemplateIdVersionsPost = mockPost;
  return client;
}

describe("TemplatesService.createVersion — body passthrough (KAD-7770)", () => {
  test("forwards CLASSIFICATION categories and schemaValidationRules to the API", async () => {
    const mockPost = mock(() =>
      Promise.resolve({
        data: { data: { id: "v-1", templateId: TEMPLATE_ID, version: 2 } },
      }),
    );
    const client = createTestClient(mockPost);

    // schemaValidationRules is a first-class field on the generated body. categories on a
    // CLASSIFICATION schema field is not yet in the prod /openapi spec (lands once KAD-7772 /
    // backend PR #9145 deploys and the spec is refetched) — until then it rides through the
    // request body unchanged. This guards that both reach the API client either way.
    const body: CreateTemplateVersionRequest = {
      prompt: "Classify reviews",
      schemaEntity: "Review",
      schemaFields: [
        {
          name: "sentiment",
          fieldType: "CLASSIFICATION",
          categories: [
            { title: "positive", definition: "Expresses approval" },
            { title: "negative", definition: "Expresses disapproval" },
          ],
        },
      ],
      schemaValidationRules: { sentiment: { required: true } },
    };

    const version = await client.template.createVersion(TEMPLATE_ID, body);

    expect(version.version).toBe(2);
    const call = mockPost.mock.calls[0]?.[0];
    expect(call.templateId).toBe(TEMPLATE_ID);
    expect(call.createTemplateVersionBody.schemaFields[0].categories).toEqual([
      { title: "positive", definition: "Expresses approval" },
      { title: "negative", definition: "Expresses disapproval" },
    ]);
    expect(call.createTemplateVersionBody.schemaValidationRules).toEqual({
      sentiment: { required: true },
    });
  });
});
