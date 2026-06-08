import { describe, expect, mock, test } from "bun:test";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";

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
