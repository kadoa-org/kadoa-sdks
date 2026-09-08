import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";
import {
  mapBillableWorkflows,
  mapQuotas,
  mapWorkspaceDetails,
} from "../../src/domains/usage/usage.acl";
import { KadoaSdkException } from "../../src/runtime/exceptions";

const rawQuotas = {
  workspace: {
    id: "11111111-1111-4111-8111-111111111111",
    type: "team",
    billingType: "enterprise_active",
    availableQuotas: { activeWorkflows: 50, maxExtractedRows: 1000000 },
    usedQuotas: {
      currentTotalWorkflows: 12,
      currentActiveWorkflows: 7,
      currentBillingActiveWorkflows: 6,
      currentBillingActiveSlots: 6.2,
      currentApprovedWorkflows: 9,
      currentScheduledWorkflows: 6,
      currentActive35Workflows: 8,
      currentContractActiveWorkflows: 9,
      currentContractActiveSlots: 9.4,
      previousContractActiveWorkflows: 4,
      previousContractActiveSlots: 4,
      currentExtractedRows: 250000,
      currentPeriodExtractedRows: 120000,
    },
    billingPeriod: {
      start: "2026-01-01T00:00:00.000Z",
      end: "2027-01-01T00:00:00.000Z",
      renewalDate: "2027-01-01",
    },
    previousBillingPeriod: {
      start: "2025-01-01T00:00:00.000Z",
      end: "2026-01-01T00:00:00.000Z",
    },
  },
  error: null,
};

describe("usage.acl mappers", () => {
  test("mapQuotas keeps limits, usage, and period with explicit names", () => {
    const quotas = mapQuotas(rawQuotas as any);
    expect(quotas.workspaceId).toBe(rawQuotas.workspace.id);
    expect(quotas.workspaceType).toBe("team");
    expect(quotas.billingModel).toBe("enterprise_active");
    expect(quotas.limits).toEqual({
      workflowSlots: 50,
      extractedRows: 1000000,
    });
    expect(quotas.used.activeWorkflowSlots).toBe(6.2);
    expect(quotas.used.contractActiveWorkflows).toBe(9);
    expect(quotas.used.extractedRowsThisPeriod).toBe(120000);
    expect(quotas.used.extractedRowsAllTime).toBe(250000);
    expect(quotas.billingPeriod?.renewalDate).toBe("2027-01-01");
    expect(quotas.previousBillingPeriod?.start).toBe(
      "2025-01-01T00:00:00.000Z",
    );
  });

  test("mapQuotas passes null period through for trial workspaces", () => {
    const quotas = mapQuotas({
      ...rawQuotas,
      workspace: {
        ...rawQuotas.workspace,
        billingPeriod: null,
        previousBillingPeriod: null,
      },
    } as any);
    expect(quotas.billingPeriod).toBeNull();
    expect(quotas.previousBillingPeriod).toBeNull();
  });

  test("mapBillableWorkflows renames billingMultiplier to slotWeight", () => {
    const result = mapBillableWorkflows({
      billingPeriod: {
        start: "2026-01-01T00:00:00.000Z",
        end: "2027-01-01T00:00:00.000Z",
      },
      count: 1,
      slotUsage: 2,
      scheduledWorkflows: 1,
      activeCount: 1,
      activeSlotUsage: 2,
      activeWorkflows: [],
      workflows: [
        {
          workflowId: "wf-1",
          name: "Prices",
          state: "ACTIVE",
          scheduled: true,
          firstRunAt: "2026-02-01T00:00:00.000Z",
          billingMultiplier: 2,
          runsInPeriod: 30,
          totalRows: 900,
        },
      ],
    } as any);
    expect(result.billableWorkflows[0]).toEqual({
      workflowId: "wf-1",
      name: "Prices",
      state: "ACTIVE",
      scheduled: true,
      firstRunAt: "2026-02-01T00:00:00.000Z",
      slotWeight: 2,
      runsInPeriod: 30,
      rowsExtracted: 900,
    });
    expect(result.billableSlotUsage).toBe(2);
    expect(result.activeWorkflows).toEqual([]);
  });

  test("mapWorkspaceDetails surfaces orgId for a team", () => {
    const details = mapWorkspaceDetails({
      workspace: {
        id: "t1",
        type: "team",
        name: "Acme",
        orgId: "o1",
        memberCount: 3,
      },
      error: null,
    } as any);
    expect(details).toEqual({
      id: "t1",
      type: "team",
      name: "Acme",
      orgId: "o1",
      memberCount: 3,
    });
  });
});

const mockDetailsGet = mock();
const mockQuotasGet = mock();
const mockBillableGet = mock();
const mockMonthlyActiveGet = mock();
const mockPeriodSeriesGet = mock();
const mockActivityUsageGet = mock();

function createTestClient(): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  const api = client.apis.workspaces as any;
  api.v5WorkspacesWorkspaceIdDetailsGet = mockDetailsGet;
  api.v5WorkspacesWorkspaceIdQuotasGet = mockQuotasGet;
  api.v5WorkspacesWorkspaceIdBillableWorkflowsGet = mockBillableGet;
  api.v5WorkspacesWorkspaceIdMonthlyActiveGet = mockMonthlyActiveGet;
  api.v5WorkspacesWorkspaceIdPeriodSeriesGet = mockPeriodSeriesGet;
  api.v5WorkspacesWorkspaceIdActivityUsageGet = mockActivityUsageGet;
  return client;
}

describe("UsageService", () => {
  beforeEach(() => {
    mockDetailsGet.mockClear();
    mockQuotasGet.mockClear();
    mockBillableGet.mockClear();
    mockMonthlyActiveGet.mockClear();
    mockPeriodSeriesGet.mockClear();
    mockActivityUsageGet.mockClear();
  });

  test("getQuotas calls the quotas endpoint with the workspace id", async () => {
    mockQuotasGet.mockResolvedValueOnce({ data: rawQuotas });
    const client = createTestClient();
    const quotas = await client.usage.getQuotas("team-1");
    expect(mockQuotasGet).toHaveBeenCalledWith({ workspaceId: "team-1" });
    expect(quotas.limits.workflowSlots).toBe(50);
  });

  test("series methods forward days and map points", async () => {
    mockMonthlyActiveGet.mockResolvedValueOnce({
      data: {
        days: [
          { date: "2026-09-01", active: 3, activeSlots: 3.1, active35: 4 },
        ],
      },
    });
    mockPeriodSeriesGet.mockResolvedValueOnce({
      data: {
        days: [
          { date: "2026-09-01", approved: 5, approvedSlots: 5, rows: 100 },
        ],
      },
    });
    mockActivityUsageGet.mockResolvedValueOnce({
      data: {
        start: "2026-08-02T00:00:00.000Z",
        end: "2026-09-01T00:00:00.000Z",
        totals: { approvedWorkflows: 2, extractedRows: 100 },
        days: [
          {
            date: "2026-09-01",
            totalWorkflows: 12,
            approvedWorkflows: 1,
            extractedRows: 100,
          },
        ],
      },
    });
    const client = createTestClient();

    const active = await client.usage.getActiveSeries("team-1", { days: 30 });
    expect(mockMonthlyActiveGet).toHaveBeenCalledWith({
      workspaceId: "team-1",
      days: 30,
    });
    expect(active[0].activeSlots).toBe(3.1);

    const period = await client.usage.getPeriodSeries("team-1", { days: 90 });
    expect(mockPeriodSeriesGet).toHaveBeenCalledWith({
      workspaceId: "team-1",
      days: 90,
    });
    expect(period[0].approved).toBe(5);

    const activity = await client.usage.getActivityUsage("team-1");
    expect(mockActivityUsageGet).toHaveBeenCalledWith({
      workspaceId: "team-1",
      days: undefined,
    });
    expect(activity.totals.extractedRows).toBe(100);
  });

  test("resolveWorkspace(team) returns the team without an extra call for the org", async () => {
    mockDetailsGet.mockResolvedValueOnce({
      data: {
        workspace: {
          id: "team-1",
          type: "team",
          name: "Acme",
          orgId: "org-1",
          memberCount: 2,
        },
      },
    });
    const client = createTestClient();
    const resolved = await client.usage.resolveWorkspace("team-1", "team");
    expect(resolved).toEqual({
      workspaceId: "team-1",
      workspaceType: "team",
      name: "Acme",
      teamId: "team-1",
      orgId: "org-1",
    });
    expect(mockDetailsGet).toHaveBeenCalledTimes(1);
    expect(mockDetailsGet).toHaveBeenCalledWith({ workspaceId: "team-1" });
  });

  test("resolveWorkspace(organization) uses the team's own orgId and the org name", async () => {
    mockDetailsGet
      .mockResolvedValueOnce({
        data: {
          workspace: {
            id: "team-1",
            type: "team",
            name: "Acme",
            orgId: "org-1",
            memberCount: 2,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          workspace: {
            id: "org-1",
            type: "organization",
            name: "Acme Holdings",
            memberCount: 9,
          },
        },
      });
    const client = createTestClient();
    const resolved = await client.usage.resolveWorkspace(
      "team-1",
      "organization",
    );
    expect(resolved).toEqual({
      workspaceId: "org-1",
      workspaceType: "organization",
      name: "Acme Holdings",
      teamId: "team-1",
      orgId: "org-1",
    });
    expect(mockDetailsGet).toHaveBeenNthCalledWith(2, { workspaceId: "org-1" });
  });

  test("resolveWorkspace(organization) rejects a standalone team", async () => {
    mockDetailsGet.mockResolvedValueOnce({
      data: {
        workspace: {
          id: "team-1",
          type: "team",
          name: "Solo",
          orgId: null,
          memberCount: 1,
        },
      },
    });
    const client = createTestClient();
    await expect(
      client.usage.resolveWorkspace("team-1", "organization"),
    ).rejects.toBeInstanceOf(KadoaSdkException);
    expect(mockQuotasGet).not.toHaveBeenCalled();
  });
});
