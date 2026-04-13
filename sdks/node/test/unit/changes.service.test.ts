import { describe, expect, mock, test } from "bun:test";
import { KadoaSdkException } from "../../src/runtime/exceptions";

// Suppress version-check network calls during tests
mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";

const mockV4ChangesGet = mock();
const mockV4ChangesChangeIdGet = mock();

function createTestClient(): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  (client.apis.workflows as any).v4ChangesGet = mockV4ChangesGet;
  (client.apis.workflows as any).v4ChangesChangeIdGet =
    mockV4ChangesChangeIdGet;
  return client;
}

const sampleChange = {
  id: "change-1",
  workflowId: "wf-1",
  data: [{ price: "$105" }],
  differences: [
    {
      type: "changed",
      fields: [{ key: "price", value: "$105", previousValue: "$100" }],
    },
  ],
  url: "https://example.com",
  summary: "Price changed from $100 to $105",
  screenshotUrl: "https://screenshots.example.com/1.png",
  createdAt: "2026-04-02T10:00:00Z",
};

describe("ChangesService", () => {
  describe("list()", () => {
    test("returns changes with default options", async () => {
      mockV4ChangesGet.mockResolvedValueOnce({
        data: {
          timestamp: "2026-04-02T10:00:00Z",
          changesCount: 1,
          changes: [sampleChange],
          pagination: { totalCount: 1, page: 1, totalPages: 1, limit: 10 },
        },
      });

      const client = createTestClient();
      const result = await client.changes.list();

      expect(result.changesCount).toBe(1);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].id).toBe("change-1");
      expect(result.changes[0].differences?.[0].type).toBe("changed");
      expect(result.changes[0].differences?.[0].fields?.[0].previousValue).toBe(
        "$100",
      );
      expect(result.pagination?.totalCount).toBe(1);
      expect(mockV4ChangesGet).toHaveBeenCalledWith({});
    });

    test("passes all options through to the API", async () => {
      mockV4ChangesGet.mockResolvedValueOnce({
        data: {
          changesCount: 0,
          changes: [],
          pagination: { totalCount: 0, page: 1, totalPages: 0, limit: 5 },
        },
      });

      const client = createTestClient();
      await client.changes.list({
        workflowIds: "wf-1,wf-2",
        startDate: "2026-04-01",
        endDate: "2026-04-02",
        skip: 10,
        limit: 5,
        exclude: "data",
      });

      expect(mockV4ChangesGet).toHaveBeenCalledWith({
        workflowIds: "wf-1,wf-2",
        startDate: "2026-04-01",
        endDate: "2026-04-02",
        skip: 10,
        limit: 5,
        exclude: "data",
      });
    });

    test("maps response correctly, drops timestamp", async () => {
      mockV4ChangesGet.mockResolvedValueOnce({
        data: {
          timestamp: "should-be-dropped",
          changesCount: 1,
          changes: [sampleChange],
          pagination: { totalCount: 1, page: 1, totalPages: 1, limit: 10 },
        },
      });

      const client = createTestClient();
      const result = await client.changes.list();

      expect((result as any).timestamp).toBeUndefined();
      expect(result.changesCount).toBe(1);
    });
  });

  describe("coalesces added+removed pairs into changed", () => {
    test("merges added/removed sharing rowRef into a single changed diff", async () => {
      mockV4ChangesGet.mockResolvedValueOnce({
        data: {
          changesCount: 1,
          changes: [
            {
              id: "c1",
              workflowId: "wf-1",
              differences: [
                {
                  type: "added",
                  fields: [{ key: "btc", value: "$74,355.26" }],
                  rowRef: {
                    currentWorkflowJobId: "j2",
                    currentRowId: "row-1",
                  },
                },
                {
                  type: "removed",
                  fields: [{ key: "btc", value: "$74,243.48" }],
                  rowRef: {
                    previousWorkflowJobId: "j1",
                    previousRowId: "row-1",
                  },
                },
              ],
            },
          ],
          pagination: { totalCount: 1, page: 1, totalPages: 1, limit: 10 },
        },
      });

      const client = createTestClient();
      const result = await client.changes.list();

      expect(result.changes[0].differences).toHaveLength(1);
      expect(result.changes[0].differences?.[0].type).toBe("changed");
      expect(result.changes[0].differences?.[0].fields?.[0]).toEqual({
        key: "btc",
        value: "$74,355.26",
        previousValue: "$74,243.48",
      });
    });

    test("leaves unpaired added/removed untouched (true insert/delete)", async () => {
      mockV4ChangesGet.mockResolvedValueOnce({
        data: {
          changesCount: 1,
          changes: [
            {
              id: "c2",
              workflowId: "wf-1",
              differences: [
                {
                  type: "added",
                  fields: [{ key: "name", value: "newrow" }],
                  rowRef: { currentRowId: "row-A" },
                },
                {
                  type: "removed",
                  fields: [{ key: "name", value: "goneRow" }],
                  rowRef: { previousRowId: "row-B" },
                },
              ],
            },
          ],
          pagination: { totalCount: 1, page: 1, totalPages: 1, limit: 10 },
        },
      });

      const client = createTestClient();
      const result = await client.changes.list();

      const diffs = result.changes[0].differences;
      expect(diffs).toHaveLength(2);
      const types = diffs?.map((d) => d.type).sort();
      expect(types).toEqual(["added", "removed"]);
    });
  });

  describe("get()", () => {
    test("returns a single change by ID", async () => {
      mockV4ChangesChangeIdGet.mockResolvedValueOnce({
        data: sampleChange,
      });

      const client = createTestClient();
      const change = await client.changes.get("change-1");

      expect(change.id).toBe("change-1");
      expect(change.summary).toBe("Price changed from $100 to $105");
      expect(mockV4ChangesChangeIdGet).toHaveBeenCalledWith({
        changeId: "change-1",
      });
    });

    test("throws NOT_FOUND when change is missing", async () => {
      mockV4ChangesChangeIdGet.mockResolvedValueOnce({ data: null });

      const client = createTestClient();

      try {
        await client.changes.get("nonexistent");
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(KadoaSdkException);
        expect((e as KadoaSdkException).code).toBe("NOT_FOUND");
      }
    });
  });
});
