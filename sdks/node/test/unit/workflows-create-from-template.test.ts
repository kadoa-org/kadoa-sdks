import { describe, expect, mock, test } from "bun:test";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";
import { KadoaSdkException } from "../../src/runtime/exceptions";

const TEMPLATE_ID = "11111111-1111-4111-8111-111111111111";

function createTestClient(
  mockPost: ReturnType<typeof mock>,
  mockTemplateGet?: ReturnType<typeof mock>,
): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  (client.apis.workflows as any).v4WorkflowsPost = mockPost;
  if (mockTemplateGet) {
    (client.template as any).get = mockTemplateGet;
  }
  return client;
}

describe("WorkflowsCoreService.create — templateId support", () => {
  test("uses explicit templateVersion when supplied", async () => {
    const mockPost = mock(() =>
      Promise.resolve({ data: { workflowId: "wf-1" } }),
    );
    const mockTemplateGet = mock();
    const client = createTestClient(mockPost, mockTemplateGet);

    const result = await client.workflow.create({
      urls: ["https://example.com"],
      templateId: TEMPLATE_ID,
      templateVersion: 3,
      tags: ["from-template"],
    });

    expect(result.id).toBe("wf-1");
    expect(mockTemplateGet).not.toHaveBeenCalled();
    const body = mockPost.mock.calls[0]?.[0]?.publicWorkflowCreateRequest;
    expect(body.urls).toEqual(["https://example.com"]);
    expect(body.templateId).toBe(TEMPLATE_ID);
    expect(body.templateVersion).toBe(3);
    expect(body.tags).toEqual(["from-template"]);
    expect(body.userPrompt).toBeUndefined();
    expect(body.navigationMode).toBeUndefined();
    expect(body.entity).toBeUndefined();
    expect(body.fields).toBeUndefined();
    expect(body.schemaId).toBeUndefined();
    expect(body.monitoring).toBeUndefined();
  });

  test("template creation without templateVersion lets the backend resolve latest", async () => {
    const mockPost = mock(() =>
      Promise.resolve({ data: { workflowId: "wf-2" } }),
    );
    const mockTemplateGet = mock();
    const client = createTestClient(mockPost, mockTemplateGet);

    const result = await client.workflow.create({
      urls: ["https://example.com"],
      templateId: TEMPLATE_ID,
    });

    expect(result.id).toBe("wf-2");
    expect(mockTemplateGet).not.toHaveBeenCalled();
    const body = mockPost.mock.calls[0]?.[0]?.publicWorkflowCreateRequest;
    expect(body.templateId).toBe(TEMPLATE_ID);
    expect(body.templateVersion).toBeUndefined();
  });

  test("forwards userPrompt as workflow-specific template instructions", async () => {
    const mockPost = mock(() => Promise.resolve({ data: { workflowId: "wf-3" } }));
    const client = createTestClient(mockPost);

    await client.workflow.create({
      urls: ["https://example.de/jobs"],
      templateId: TEMPLATE_ID,
      templateVersion: 1,
      userPrompt: "Only include German-language listings",
    });

    expect(mockPost.mock.calls[0]?.[0]?.publicWorkflowCreateRequest).toEqual(
      expect.objectContaining({
        templateId: TEMPLATE_ID,
        templateVersion: 1,
        userPrompt: "Only include German-language listings",
      }),
    );
  });

  test("template-only creation still omits userPrompt", async () => {
    const mockPost = mock(() => Promise.resolve({ data: { workflowId: "wf-4" } }));
    const client = createTestClient(mockPost);

    await client.workflow.create({
      urls: ["https://example.de/jobs"],
      templateId: TEMPLATE_ID,
      templateVersion: 1,
    });

    expect(
      mockPost.mock.calls[0]?.[0]?.publicWorkflowCreateRequest.userPrompt,
    ).toBeUndefined();
  });

  test("still requires userPrompt when no templateId is supplied", async () => {
    const mockPost = mock();
    const client = createTestClient(mockPost);

    await expect(
      client.workflow.create({
        urls: ["https://example.com"],
      } as any),
    ).rejects.toBeInstanceOf(KadoaSdkException);
    expect(mockPost).not.toHaveBeenCalled();
  });
});
