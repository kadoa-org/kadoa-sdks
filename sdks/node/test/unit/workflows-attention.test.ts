import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient, WorkflowStatusFilter } from "../../src";

const mockList = mock();

function createTestClient(): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  Object.assign(client.apis.workflows, { v4WorkflowsGet: mockList });
  return client;
}

const attentionRow = {
  id: "wf-attention",
  name: "Needs an answer",
  state: "SETUP",
  displayState: "SETUP",
  awaitingUserInput: {
    since: "2026-09-01T08:00:00.000Z",
    prompt: "Which country should I scrape?",
  },
};

describe("workflow.list attention filter", () => {
  beforeEach(() => mockList.mockReset());

  test("exports the dashboard group filter constants", () => {
    expect(WorkflowStatusFilter.Attention).toBe("group:attention");
    expect(Object.values(WorkflowStatusFilter)).toHaveLength(7);
  });

  test("forwards statusFilters to the generated API untouched", async () => {
    mockList.mockResolvedValueOnce({ data: { workflows: [attentionRow] } });
    const client = createTestClient();

    await client.workflow.list({
      statusFilters: [WorkflowStatusFilter.Attention],
      limit: 10,
    });

    expect(mockList).toHaveBeenCalledWith({
      statusFilters: ["group:attention"],
      limit: 10,
    });
  });

  test("preserves awaitingUserInput on returned rows", async () => {
    mockList.mockResolvedValueOnce({ data: { workflows: [attentionRow] } });
    const client = createTestClient();

    const [row] = await client.workflow.list({
      statusFilters: ["group:attention"],
    });

    expect(row.awaitingUserInput).toEqual({
      since: "2026-09-01T08:00:00.000Z",
      prompt: "Which country should I scrape?",
    });
  });
});
