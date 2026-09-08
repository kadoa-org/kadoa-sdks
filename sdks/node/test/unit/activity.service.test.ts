import { describe, expect, mock, test } from "bun:test";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";

const mockV4ActivityGet = mock();

function createTestClient(): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  (client.apis.activity as any).v4ActivityGet = mockV4ActivityGet;
  return client;
}

const sampleEvent = {
  title: "UPDATED",
  dateTime: "2026-09-01T10:00:00.000Z",
  source: {
    requestSource: "UI",
    userId: "user-1",
    userEmail: "alice@example.com",
  },
  resource: {
    type: "WORKFLOW",
    workflowId: "wf-1",
    resourceId: "wf-1",
    name: "Kadoa News",
  },
  details: {
    state: "UPDATED",
    operationType: "UPDATE",
    resourceType: "WORKFLOW",
    _changeSummary: "Schedule changed",
  },
};

const sampleResponse = {
  error: false,
  data: {
    events: [sampleEvent],
    pagination: { total: 1, limit: 25, offset: 0, hasMore: false },
  },
};

describe("ActivityService.list", () => {
  test("calls v4ActivityGet with an empty request when no options given", async () => {
    mockV4ActivityGet.mockResolvedValueOnce({ data: sampleResponse });

    const client = createTestClient();
    const result = await client.activity.list();

    expect(mockV4ActivityGet).toHaveBeenCalledWith({});
    expect(result.events).toHaveLength(1);
    expect(result.events[0].source?.userEmail).toBe("alice@example.com");
    expect(result.events[0].resource?.name).toBe("Kadoa News");
    expect(result.pagination).toEqual({
      total: 1,
      limit: 25,
      offset: 0,
      hasMore: false,
    });
  });

  test("forwards every filter verbatim", async () => {
    mockV4ActivityGet.mockResolvedValueOnce({ data: sampleResponse });

    const client = createTestClient();
    await client.activity.list({
      limit: 10,
      offset: 20,
      workflowId: "wf-1",
      userId: "user-1",
      startDate: "2026-08-01T00:00:00.000Z",
      endDate: "2026-09-01T00:00:00.000Z",
      relativeTime: "7d",
      eventTypes: "UPDATED,DELETED",
      interfaces: "UI,MCP",
      resourceTypes: "WORKFLOW",
    });

    expect(mockV4ActivityGet).toHaveBeenCalledWith({
      limit: 10,
      offset: 20,
      workflowId: "wf-1",
      userId: "user-1",
      startDate: "2026-08-01T00:00:00.000Z",
      endDate: "2026-09-01T00:00:00.000Z",
      relativeTime: "7d",
      eventTypes: "UPDATED,DELETED",
      interfaces: "UI,MCP",
      resourceTypes: "WORKFLOW",
    });
  });

  test("returns an empty result when the API returns no events", async () => {
    mockV4ActivityGet.mockResolvedValueOnce({
      data: {
        error: false,
        data: {
          events: [],
          pagination: { total: 0, limit: 25, offset: 0, hasMore: false },
        },
      },
    });

    const client = createTestClient();
    const result = await client.activity.list({ relativeTime: "1h" });

    expect(result.events).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  test("propagates API errors", async () => {
    mockV4ActivityGet.mockRejectedValueOnce(new Error("boom"));

    const client = createTestClient();
    await expect(client.activity.list()).rejects.toThrow("boom");
  });
});
