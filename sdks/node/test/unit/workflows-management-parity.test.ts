import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";
import type {
  GetWorkflowResponse,
  UpdateWorkflowRequest,
  WorkflowResponse,
} from "../../src/domains/workflows/workflows.acl";

const mockUpdate = mock();
const mockGet = mock();
const mockList = mock();

function createTestClient(): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  Object.assign(client.apis.workflows, {
    v4WorkflowsGet: mockList,
    v4WorkflowsWorkflowIdMetadataPut: mockUpdate,
    v4WorkflowsWorkflowIdGet: mockGet,
  });
  return client;
}

describe("workflow management parity", () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    mockGet.mockReset();
    mockList.mockReset();
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

  test("types and returns workflow list summaries without dropping fields", async () => {
    const response = {
      id: "wf-1",
      state: "ACTIVE",
      displayState: "RUNNING",
      runState: "RUNNING",
      isRealTime: true,
      lastDataChangedAt: "2026-08-20T12:00:00.000Z",
      observerHealth: {
        healthTier: "WARNING",
        reason: "No data change detected",
        lastCheckedAt: "2026-08-20T12:05:00.000Z",
      },
      dataStale: true,
      assistantEligible: true,
      assistantSessionId: "session-1",
      assistantThreadId: "thread-1",
      sessionStatus: "idle",
      templateId: "template-1",
      templateVersion: 3,
      templateLatestVersion: 4,
      templateIsOutdated: true,
    } satisfies WorkflowResponse;
    mockList.mockResolvedValueOnce({ data: { workflows: [response] } });

    const client = createTestClient();
    const workflows = await client.workflow.list();

    expect(workflows).toEqual([response]);
    expect(workflows[0]).toMatchObject({
      assistantSessionId: "session-1",
      templateLatestVersion: 4,
      observerHealth: { healthTier: "WARNING" },
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
