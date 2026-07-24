import { describe, expect, mock, test } from "bun:test";

// Suppress version-check network calls during tests (matches existing test convention)
mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";

const mockHistoryGet = mock();

function createTestClient(): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  (client.apis.workflows as any).v4WorkflowsWorkflowIdHistoryGet =
    mockHistoryGet;
  return client;
}

describe("WorkflowsCoreService.listWorkflowRuns", () => {
  test("passes page/limit/status through and returns response.data", async () => {
    const data = {
      workflowId: "wf1",
      workflowRuns: [{ id: "r1", state: "FINISHED" }],
      totalCount: 1,
    };
    mockHistoryGet.mockResolvedValueOnce({ data });

    const client = createTestClient();
    const res = await client.workflow.listWorkflowRuns("wf1", {
      page: 2,
      limit: 5,
      status: "success",
    });

    expect(mockHistoryGet).toHaveBeenCalledWith({
      workflowId: "wf1",
      page: 2,
      limit: 5,
      status: "success",
    });
    expect(res).toEqual(data);
  });

  test("calls the API with only workflowId when no options given", async () => {
    mockHistoryGet.mockResolvedValueOnce({
      data: { workflowId: "wf1", workflowRuns: [] },
    });

    const client = createTestClient();
    await client.workflow.listWorkflowRuns("wf1");

    expect(mockHistoryGet).toHaveBeenCalledWith({
      workflowId: "wf1",
      page: undefined,
      limit: undefined,
      status: undefined,
    });
  });

  test("propagates API errors", async () => {
    mockHistoryGet.mockRejectedValueOnce(new Error("boom"));

    const client = createTestClient();
    await expect(client.workflow.listWorkflowRuns("wf1")).rejects.toThrow(
      "boom",
    );
  });
});
