import { describe, expect, mock, test } from "bun:test";
import type { WorkflowsApiInterface } from "../../src/domains/extraction";
import { DataFetcherService } from "../../src/domains/extraction/services/data-fetcher.service";

describe("DataFetcherService.exportData", () => {
  test("calls /data/export with all forwarded query params", async () => {
    const v4WorkflowsWorkflowIdDataExportGet = mock(async () => ({
      data: {
        workflowId: "wf-1",
        runId: "run-9",
        executedAt: "2026-05-11T12:00:00Z",
        format: "json",
        rowCount: 42,
        url: "https://exports.kadoa.com/signed/abc?sig=xyz",
        expiresAt: "2026-05-12T12:00:00Z",
      },
    }));

    const api = {
      v4WorkflowsWorkflowIdDataExportGet,
    } as unknown as WorkflowsApiInterface;

    const service = new DataFetcherService(api);
    const result = await service.exportData({
      workflowId: "wf-1",
      format: "json",
      runId: "run-9",
      filters: "[]",
      sortBy: "createdAt",
      order: "asc",
      rowIds: "1,2,3",
    });

    expect(v4WorkflowsWorkflowIdDataExportGet).toHaveBeenCalledWith({
      workflowId: "wf-1",
      format: "json",
      runId: "run-9",
      filters: "[]",
      sortBy: "createdAt",
      order: "asc",
      rowIds: "1,2,3",
    });
    expect(result.url).toContain("https://exports.kadoa.com/signed/abc");
    expect(result.format).toBe("json");
    expect(result.rowCount).toBe(42);
  });

  test("defaults are left to the backend when only workflowId is given", async () => {
    const v4WorkflowsWorkflowIdDataExportGet = mock(async () => ({
      data: {
        workflowId: "wf-1",
        runId: "run-9",
        format: "csv",
        rowCount: 0,
        url: "https://exports.kadoa.com/signed/abc",
        expiresAt: "2026-05-12T12:00:00Z",
      },
    }));

    const api = {
      v4WorkflowsWorkflowIdDataExportGet,
    } as unknown as WorkflowsApiInterface;

    const service = new DataFetcherService(api);
    await service.exportData({ workflowId: "wf-1" });

    expect(v4WorkflowsWorkflowIdDataExportGet).toHaveBeenCalledWith({
      workflowId: "wf-1",
      format: undefined,
      runId: undefined,
      filters: undefined,
      sortBy: undefined,
      order: undefined,
      rowIds: undefined,
    });
  });
});
