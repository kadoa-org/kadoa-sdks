import { describe, expect, mock, test } from "bun:test";
import { KadoaSdkException } from "../../src/runtime/exceptions";

// Suppress version-check network calls during tests
mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";
import {
  mapObservabilityOverview,
  OBSERVABILITY_REQUEST_TIMEOUT_MS,
  toObservabilityRequest,
} from "../../src/domains/observability";

const rawOverview = {
  overallUptimePercentage: 96.4,
  successfulRuns: 27,
  failedRuns: 1,
  mttrMinutes: 42,
  totalRecordsDelivered: 5400,
  avgRecordsPerRun: 200,
  avgCustomerReviewHours: null,
  healthyWorkflows: 2,
  degradedWorkflows: 0,
  downWorkflows: 1,
  idleWorkflows: 0,
  openIncidents: 1,
  previous: {
    uptimePercentage: 91.2,
    totalRecordsDelivered: 4100,
    mttrMinutes: 60,
  },
  workflows: [
    {
      workflowId: "wf-down",
      workflowName: "Prices EU",
      health: "down",
      successfulRuns: 6,
      failedRuns: 1,
      uptimePercentage: 85.7,
      totalRecordsDelivered: 1200,
      avgRecordsPerRun: 200,
      mttrMinutes: 42,
      daily: [
        {
          date: "2026-09-07",
          successfulRuns: 0,
          failedRuns: 1,
          uptimePercentage: 0,
        },
      ],
    },
  ],
  daily: [
    {
      date: "2026-09-07",
      successfulRuns: 3,
      failedRuns: 1,
      uptimePercentage: 75,
    },
  ],
  supportRequests: [
    {
      workflowId: "wf-down",
      workflowName: "Prices EU",
      requestedAt: "2026-09-07T10:00:00.000Z",
      resolvedAt: null,
      resolutionHours: null,
      linearIssue: "KAD-1",
      creatorType: "user",
      requestedBy: "alice@example.com",
    },
  ],
  workflowLifecycles: [
    {
      workflowId: "wf-down",
      workflowName: "Prices EU",
      createdAt: "2026-08-01T00:00:00.000Z",
      buildingHours: 1.5,
      reviewHours: 2,
      runtimeHours: 0.2,
    },
  ],
  windowStart: "2026-08-09T12:00:00.000Z",
  windowEnd: "2026-09-08T12:00:00.000Z",
};

describe("observability ACL", () => {
  test("mapObservabilityOverview keeps every field the API returns", () => {
    const overview = mapObservabilityOverview(rawOverview);

    expect(overview).toEqual(rawOverview);
    expect(overview.workflows[0].daily).toHaveLength(1);
    expect(overview.supportRequests[0].linearIssue).toBe("KAD-1");
  });

  test("mapObservabilityOverview defaults missing optional collections to empty arrays and null snapshot", () => {
    const { previous, supportRequests, workflowLifecycles, ...rest } =
      rawOverview;
    const overview = mapObservabilityOverview({ ...rest, previous: undefined });

    expect(overview.previous).toBeNull();
    expect(overview.supportRequests).toEqual([]);
    expect(overview.workflowLifecycles).toEqual([]);
  });

  test("mapObservabilityOverview rejects a body without the headline numbers", () => {
    expect(() => mapObservabilityOverview({ workflows: [] })).toThrow(
      KadoaSdkException,
    );
    expect(() => mapObservabilityOverview(null)).toThrow(KadoaSdkException);
    expect(() => mapObservabilityOverview("<html>")).toThrow(KadoaSdkException);
  });

  test("toObservabilityRequest sends days as a string and validates the range", () => {
    expect(toObservabilityRequest("team-1", { days: 90 })).toEqual({
      workspaceId: "team-1",
      days: "90",
    });
    expect(toObservabilityRequest("team-1")).toEqual({
      workspaceId: "team-1",
      days: undefined,
    });
    expect(() => toObservabilityRequest("team-1", { days: 0 })).toThrow(
      KadoaSdkException,
    );
    expect(() => toObservabilityRequest("team-1", { days: 366 })).toThrow(
      KadoaSdkException,
    );
    expect(() => toObservabilityRequest("team-1", { days: 2.5 })).toThrow(
      KadoaSdkException,
    );
  });
});

const mockObservabilityGet = mock();

function createTestClient(): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  (client.apis.workspaces as any).v5WorkspacesWorkspaceIdObservabilityGet =
    mockObservabilityGet;
  return client;
}

describe("ObservabilityService.getOverview", () => {
  test("sends the workspace id, days as a string, and a 90 second timeout", async () => {
    mockObservabilityGet.mockResolvedValueOnce({ data: rawOverview });
    const client = createTestClient();

    const overview = await client.observability.getOverview("team-1", {
      days: 90,
    });

    expect(mockObservabilityGet).toHaveBeenCalledWith(
      { workspaceId: "team-1", days: "90" },
      { timeout: OBSERVABILITY_REQUEST_TIMEOUT_MS },
    );
    expect(OBSERVABILITY_REQUEST_TIMEOUT_MS).toBe(90_000);
    expect(overview.downWorkflows).toBe(1);
    expect(overview.workflows[0].workflowName).toBe("Prices EU");
  });

  test("omits days when not given so the API default applies", async () => {
    mockObservabilityGet.mockResolvedValueOnce({ data: rawOverview });
    const client = createTestClient();

    await client.observability.getOverview("team-1");

    expect(mockObservabilityGet.mock.calls.at(-1)?.[0]).toEqual({
      workspaceId: "team-1",
      days: undefined,
    });
  });

  test("rejects an out-of-range days before calling the API", async () => {
    mockObservabilityGet.mockClear();
    const client = createTestClient();

    await expect(
      client.observability.getOverview("team-1", { days: 400 }),
    ).rejects.toBeInstanceOf(KadoaSdkException);
    expect(mockObservabilityGet).not.toHaveBeenCalled();
  });

  test("rejects a malformed body instead of returning it", async () => {
    mockObservabilityGet.mockResolvedValueOnce({
      data: "<html>gateway timeout</html>",
    });
    const client = createTestClient();

    await expect(
      client.observability.getOverview("team-1"),
    ).rejects.toBeInstanceOf(KadoaSdkException);
  });
});
