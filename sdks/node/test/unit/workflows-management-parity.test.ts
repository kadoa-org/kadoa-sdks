import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";
import type {
  GetWorkflowResponse,
  UpdateWorkflowRequest,
} from "../../src/domains/workflows/workflows.acl";

const mockUpdate = mock();
const mockGet = mock();

function createTestClient(): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  Object.assign(client.apis.workflows, {
    v4WorkflowsWorkflowIdMetadataPut: mockUpdate,
    v4WorkflowsWorkflowIdGet: mockGet,
  });
  return client;
}

describe("workflow management parity", () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    mockGet.mockReset();
  });

  test("forwards deterministic settings without dropping nullable unlimited rows", async () => {
    mockUpdate.mockResolvedValueOnce({ data: { success: true } });
    const input = {
      limit: null,
      timezone: "America/New_York",
      location: { type: "manual", isoCode: "US" },
      monitoring: {
        fields: [
          { fieldName: "price", operator: "changed", isKeyField: false },
        ],
        conditions: {
          logicalOperator: "AND",
          conditions: [
            {
              type: "SINGLE",
              field: "price",
              operator: "GREATER_THAN",
              value: 100,
            },
          ],
        },
      },
    } satisfies UpdateWorkflowRequest;

    const client = createTestClient();
    await client.workflow.update("wf-1", input);

    expect(mockUpdate).toHaveBeenCalledWith({
      workflowId: "wf-1",
      v4WorkflowsWorkflowIdMetadataPutRequest: input,
    });
  });

  test("types and returns the canonical workflow management detail fields", async () => {
    const response = {
      id: "wf-1",
      entity: "Product",
      extractionSpec: { rawPrompt: "Extract every product" },
      dataStale: true,
      scheduleTimezone: "America/New_York",
      assistantEligible: true,
      assistantSessionId: "session-1",
      assistantThreadId: "thread-1",
      sessionStatus: "idle",
      templateId: "template-1",
      templateVersion: 3,
      templateHasPrompt: true,
      templateHasSchema: true,
      templateHasNotifications: false,
      templateHasFrequency: true,
      observerHealth: { healthTier: "HEALTHY" },
      channelCounts: { EMAIL: 1 },
    } satisfies GetWorkflowResponse;
    mockGet.mockResolvedValueOnce({ data: response });

    const client = createTestClient();
    const workflow = await client.workflow.get("wf-1");

    expect(workflow).toEqual(response);
    expect(workflow.extractionSpec).toEqual({
      rawPrompt: "Extract every product",
    });
    expect(workflow.templateHasFrequency).toBe(true);
    expect(workflow.scheduleTimezone).toBe("America/New_York");
  });
});
