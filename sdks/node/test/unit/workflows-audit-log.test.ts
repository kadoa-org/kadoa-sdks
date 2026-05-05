import { describe, expect, mock, test } from "bun:test";

// Suppress version-check network calls during tests (matches existing test convention)
mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";

const mockV5AuditLogGet = mock();

function createTestClient(): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  (client.apis.workflows as any).v5WorkflowsWorkflowIdAuditlogGet =
    mockV5AuditLogGet;
  return client;
}

const sampleEntry = {
  id: "audit-1",
  operationType: "UPDATE" as const,
  userId: "user-1",
  userEmail: "alice@example.com",
  previousValue: { name: "old" },
  newValue: { name: "new" },
  createdAt: "2026-05-05T10:00:00Z",
  requestSource: "API",
  authMethod: "TEAM_API_KEY",
};

const sampleResponse = {
  id: "wf-1",
  timestamp: "2026-05-05T10:00:01Z",
  logEntriesCount: 1,
  logEntries: [sampleEntry],
  pagination: { page: 1, limit: 25, totalPages: 1, totalCount: 1 },
};

describe("WorkflowsCoreService.getAuditLog", () => {
  test("calls v5 endpoint with workflowId only when no options given", async () => {
    mockV5AuditLogGet.mockResolvedValueOnce({ data: sampleResponse });

    const client = createTestClient();
    const result = await client.workflow.getAuditLog("wf-1");

    expect(mockV5AuditLogGet).toHaveBeenCalledWith({
      workflowId: "wf-1",
      page: undefined,
      limit: undefined,
    });
    expect(result.id).toBe("wf-1");
    expect(result.logEntries?.[0]?.requestSource).toBe("API");
    expect(result.logEntries?.[0]?.authMethod).toBe("TEAM_API_KEY");
  });

  test("forwards page and limit options", async () => {
    mockV5AuditLogGet.mockResolvedValueOnce({ data: sampleResponse });

    const client = createTestClient();
    await client.workflow.getAuditLog("wf-1", { page: 2, limit: 50 });

    expect(mockV5AuditLogGet).toHaveBeenCalledWith({
      workflowId: "wf-1",
      page: 2,
      limit: 50,
    });
  });

  test("propagates API errors", async () => {
    mockV5AuditLogGet.mockRejectedValueOnce(new Error("boom"));

    const client = createTestClient();
    await expect(client.workflow.getAuditLog("wf-1")).rejects.toThrow("boom");
  });
});
