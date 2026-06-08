import { describe, expect, mock, test } from "bun:test";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";
import { KadoaHttpException } from "../../src/runtime/exceptions";

const TEMPLATE_ID = "11111111-1111-4111-8111-111111111111";

describe("TemplatesService.linkWorkflows", () => {
  test("posts workflowIds to the link endpoint and returns the result", async () => {
    const mockLink = mock(() =>
      Promise.resolve({
        data: {
          error: false,
          success: true,
          linkedCount: 2,
          workflowIds: ["wf-1", "wf-2"],
        },
      }),
    );
    const client = new KadoaClient({ apiKey: "tk-test" });
    (client.apis.templates as any).v4TemplatesTemplateIdLinkPost = mockLink;

    const result = await client.template.linkWorkflows(TEMPLATE_ID, {
      workflowIds: ["wf-1", "wf-2"],
    });

    expect(result.linkedCount).toBe(2);
    expect(result.workflowIds).toEqual(["wf-1", "wf-2"]);

    const arg = mockLink.mock.calls[0]?.[0];
    expect(arg.templateId).toBe(TEMPLATE_ID);
    expect(arg.linkWorkflowsBody).toEqual({ workflowIds: ["wf-1", "wf-2"] });
  });

  test("forwards the force flag when relinking", async () => {
    const mockLink = mock(() =>
      Promise.resolve({
        data: {
          error: false,
          success: true,
          linkedCount: 1,
          workflowIds: ["wf-1"],
        },
      }),
    );
    const client = new KadoaClient({ apiKey: "tk-test" });
    (client.apis.templates as any).v4TemplatesTemplateIdLinkPost = mockLink;

    await client.template.linkWorkflows(TEMPLATE_ID, {
      workflowIds: ["wf-1"],
      force: true,
    });

    expect(mockLink.mock.calls[0]?.[0]?.linkWorkflowsBody).toEqual({
      workflowIds: ["wf-1"],
      force: true,
    });
  });
});

describe("TemplatesService.unlinkWorkflows", () => {
  test("posts workflowIds to the unlink endpoint and returns the result", async () => {
    const mockUnlink = mock(() =>
      Promise.resolve({
        data: {
          error: false,
          success: true,
          unlinkedCount: 1,
          workflowIds: ["wf-1"],
        },
      }),
    );
    const client = new KadoaClient({ apiKey: "tk-test" });
    (client.apis.templates as any).v4TemplatesTemplateIdUnlinkPost = mockUnlink;

    const result = await client.template.unlinkWorkflows(TEMPLATE_ID, {
      workflowIds: ["wf-1"],
    });

    expect(result.unlinkedCount).toBe(1);
    expect(result.workflowIds).toEqual(["wf-1"]);

    const arg = mockUnlink.mock.calls[0]?.[0];
    expect(arg.templateId).toBe(TEMPLATE_ID);
    expect(arg.unlinkWorkflowsBody).toEqual({ workflowIds: ["wf-1"] });
  });
});

describe("TemplatesService.linkWorkflows — 409 conflict", () => {
  test("returns conflicts instead of throwing when workflows are already linked", async () => {
    const conflicts = [
      {
        workflowId: "wf-9",
        workflowName: "Already Linked",
        templateId: "other-tpl",
        templateName: "Other Template",
      },
    ];
    const mockLink = mock(() =>
      Promise.reject(
        new KadoaHttpException("Conflict", {
          httpStatus: 409,
          responseBody: { error: true, code: "CONFLICT", conflicts },
        }),
      ),
    );
    const client = new KadoaClient({ apiKey: "tk-test" });
    (client.apis.templates as any).v4TemplatesTemplateIdLinkPost = mockLink;

    const result = await client.template.linkWorkflows(TEMPLATE_ID, {
      workflowIds: ["wf-9"],
    });

    expect(result.success).toBe(false);
    expect(result.conflicts).toEqual(conflicts);
  });

  test("rethrows non-409 errors", async () => {
    const mockLink = mock(() =>
      Promise.reject(
        new KadoaHttpException("Server error", { httpStatus: 500 }),
      ),
    );
    const client = new KadoaClient({ apiKey: "tk-test" });
    (client.apis.templates as any).v4TemplatesTemplateIdLinkPost = mockLink;

    await expect(
      client.template.linkWorkflows(TEMPLATE_ID, { workflowIds: ["wf-9"] }),
    ).rejects.toBeInstanceOf(KadoaHttpException);
  });
});

describe("TemplatesService.getLinkedWorkflows", () => {
  test("returns the linked workflows with drift info", async () => {
    const workflows = [
      {
        workflowId: "wf-1",
        workflowName: "WF One",
        templateVersion: 2,
        isOutdated: true,
        state: "ACTIVE",
        isRealTime: false,
      },
    ];
    const mockGet = mock(() => Promise.resolve({ data: { data: workflows } }));
    const client = new KadoaClient({ apiKey: "tk-test" });
    (client.apis.templates as any).v4TemplatesTemplateIdWorkflowsGet = mockGet;

    const result = await client.template.getLinkedWorkflows(TEMPLATE_ID);

    expect(result).toEqual(workflows);
    expect(mockGet.mock.calls[0]?.[0]).toEqual({ templateId: TEMPLATE_ID });
  });

  test("returns an empty array when the API returns no data", async () => {
    const mockGet = mock(() => Promise.resolve({ data: {} }));
    const client = new KadoaClient({ apiKey: "tk-test" });
    (client.apis.templates as any).v4TemplatesTemplateIdWorkflowsGet = mockGet;

    const result = await client.template.getLinkedWorkflows(TEMPLATE_ID);

    expect(result).toEqual([]);
  });
});

describe("TemplatesService.applyVersion", () => {
  test("posts targetVersion + workflowIds and returns the result", async () => {
    const mockApply = mock(() =>
      Promise.resolve({
        data: {
          error: false,
          success: true,
          updatedCount: 3,
          workflowIds: ["wf-1", "wf-2", "wf-3"],
          controlledParts: {
            prompt: true,
            schema: true,
            schemaValidationRules: false,
            notifications: false,
            frequency: true,
          },
        },
      }),
    );
    const client = new KadoaClient({ apiKey: "tk-test" });
    (client.apis.templates as any).v4TemplatesTemplateIdApplyPost = mockApply;

    const result = await client.template.applyVersion(TEMPLATE_ID, {
      targetVersion: 2,
      workflowIds: ["wf-1", "wf-2", "wf-3"],
    });

    expect(result.updatedCount).toBe(3);
    expect(result.controlledParts.frequency).toBe(true);

    const arg = mockApply.mock.calls[0]?.[0];
    expect(arg.templateId).toBe(TEMPLATE_ID);
    expect(arg.applyTemplateUpdateBody).toEqual({
      targetVersion: 2,
      workflowIds: ["wf-1", "wf-2", "wf-3"],
    });
  });
});
