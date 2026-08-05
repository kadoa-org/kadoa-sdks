import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import {
  type InboxItem,
  InboxItemType,
  type InboxItemType as InboxItemTypeValue,
  type InboxListResult,
  type InboxMarkReadResult,
  KadoaClient,
} from "../../src";

const mockList = mock();
const mockMarkRead = mock();

function createTestClient(): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  Object.assign(client.apis.inbox, {
    v5InboxList: mockList,
    v5InboxMarkRead: mockMarkRead,
  });
  return client;
}

const baseItem = {
  id: "33333333-3333-4333-8333-333333333333",
  teamId: "22222222-2222-4222-8222-222222222222",
  userId: "11111111-1111-4111-8111-111111111111",
  type: "shelly_question",
  subjectId: "question-1",
  workflowId: "44444444-4444-4444-8444-444444444444",
  title: "Which source should be used?",
  payload: { sessionId: "session-1", futureKey: "preserved" },
  isRead: false,
  readAt: null,
  deletedAt: null,
  createdAt: "2026-08-05T10:00:00.000Z",
  updatedAt: "2026-08-05T10:00:00.000Z",
};

function listResponse(items: Array<Record<string, unknown>>, unreadCount = 1) {
  return {
    data: {
      data: { unreadCount, items },
      status: "success",
    },
  };
}

describe("InboxService", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockMarkRead.mockReset();
  });

  test("exports the curated Inbox contract from the package root", () => {
    const type: InboxItemTypeValue = InboxItemType.AssistantQuestion;
    const item = { type } as InboxItem;
    const list = { unreadCount: 0, items: [item] } as InboxListResult;
    const mutation: InboxMarkReadResult = { readCount: 0 };

    expect(list.items[0]?.type).toBe("shelly_question");
    expect(mutation.readCount).toBe(0);
  });

  test("lists curated personal Inbox items", async () => {
    mockList.mockResolvedValueOnce(listResponse([baseItem]));

    const result = await createTestClient().inbox.list();

    expect(mockList).toHaveBeenCalledWith();
    expect(result).toEqual({
      unreadCount: 1,
      items: [
        {
          id: baseItem.id,
          type: "shelly_question",
          subjectId: "question-1",
          workflowId: baseItem.workflowId,
          title: "Which source should be used?",
          payload: { sessionId: "session-1", futureKey: "preserved" },
          isRead: false,
          readAt: null,
          createdAt: "2026-08-05T10:00:00.000Z",
          updatedAt: "2026-08-05T10:00:00.000Z",
        },
      ],
    });
    expect(result.items[0]).not.toHaveProperty("teamId");
    expect(result.items[0]).not.toHaveProperty("userId");
    expect(result.items[0]).not.toHaveProperty("deletedAt");
  });

  test("preserves every known item type and nullable fields", async () => {
    mockList.mockResolvedValueOnce(
      listResponse(
        [
          { ...baseItem, type: "shelly_question" },
          {
            ...baseItem,
            id: "55555555-5555-4555-8555-555555555555",
            type: "data_quality_issues",
            workflowId: null,
            readAt: "2026-08-05T11:00:00.000Z",
          },
          {
            ...baseItem,
            id: "66666666-6666-4666-8666-666666666666",
            type: "sample_data_ready",
          },
        ],
        2,
      ),
    );

    const result = await createTestClient().inbox.list();

    expect(result.items.map((item) => item.type)).toEqual([
      "shelly_question",
      "data_quality_issues",
      "sample_data_ready",
    ]);
    expect(result.items[1]?.workflowId).toBeNull();
    expect(result.items[1]?.readAt).toBe("2026-08-05T11:00:00.000Z");
  });

  test("passes through future item types and payload keys", async () => {
    mockList.mockResolvedValueOnce(
      listResponse([
        {
          ...baseItem,
          type: "future_attention_item",
          payload: { futureShape: { nested: true } },
        },
      ]),
    );

    const result = await createTestClient().inbox.list();

    expect(result.items[0]?.type).toBe("future_attention_item");
    expect(result.items[0]?.payload).toEqual({
      futureShape: { nested: true },
    });
  });

  test.each([
    1, 0,
  ])("marks one item read and returns readCount=%i", async (readCount) => {
    mockMarkRead.mockResolvedValueOnce({
      data: { data: { readCount }, status: "success" },
    });
    const itemId = "33333333-3333-4333-8333-333333333333";

    const result = await createTestClient().inbox.markRead(itemId);

    expect(mockMarkRead).toHaveBeenCalledWith({ itemId });
    expect(result).toEqual({ readCount });
  });

  test("propagates generated API errors", async () => {
    mockList.mockRejectedValueOnce(new Error("Inbox unavailable"));

    await expect(createTestClient().inbox.list()).rejects.toThrow(
      "Inbox unavailable",
    );
  });
});
