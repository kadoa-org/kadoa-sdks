import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const specPath = new URL("../../../../specs/openapi.json", import.meta.url);

describe("published OpenAPI source", () => {
  test("is valid JSON without a duplicate workflow strategy field", () => {
    const source = readFileSync(specPath, "utf8");

    expect(() => JSON.parse(source)).not.toThrow();
    expect(source.match(/"extractionStrategySummary"\s*:/g)).toHaveLength(1);
  });

  test("includes workflow Assistant message history", () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));

    expect(
      spec.paths["/v5/agent/workflows/{workflowId}/timeline"].get.operationId,
    ).toBe("v5AgentWorkflowAssistantTimeline");
  });

  test("no longer includes the retired Inbox operations", () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));

    expect(spec.paths["/v5/inbox"]).toBeUndefined();
    expect(spec.paths["/v5/inbox/{itemId}/mark-read"]).toBeUndefined();
    const inboxSchemas = Object.keys(spec.components.schemas).filter((name) =>
      name.startsWith("Inbox"),
    );
    expect(inboxSchemas).toEqual([]);
  });

  test("documents statusFilters and awaitingUserInput on the workflow list", () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));

    const params = spec.paths["/v4/workflows"].get.parameters as Array<{
      name: string;
    }>;
    expect(params.some((p) => p.name === "statusFilters")).toBe(true);
    const row =
      spec.paths["/v4/workflows"].get.responses["200"].content[
        "application/json"
      ].schema.properties.workflows.items.properties;
    expect(row.awaitingUserInput.properties.since.format).toBe("date-time");
  });

  test.todo(
    "statusFilters enum in the spec equals Object.values(WorkflowStatusFilter) once the backend publishes the enum (kadoa-backend#11821)",
  );

  test("documents the team activity log used by client.activity.list", () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));

    const params = spec.paths["/v4/activity/"].get.parameters as Array<{
      name: string;
    }>;
    const names = params.map((p) => p.name).sort();
    expect(names).toEqual([
      "endDate",
      "eventTypes",
      "interfaces",
      "limit",
      "offset",
      "relativeTime",
      "resourceTypes",
      "startDate",
      "userId",
      "workflowId",
    ]);
  });

  test("documents the six workspace usage endpoints the Usage page reads", () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    for (const suffix of [
      "details",
      "quotas",
      "billable-workflows",
      "monthly-active",
      "period-series",
      "activity-usage",
    ]) {
      expect(
        spec.paths[`/v5/workspaces/{workspaceId}/${suffix}`]?.get,
      ).toBeDefined();
    }
    const used =
      spec.paths["/v5/workspaces/{workspaceId}/quotas"].get.responses["200"]
        .content["application/json"].schema.properties.workspace.properties
        .usedQuotas.properties;
    expect(used.currentContractActiveWorkflows).toBeDefined();
    expect(used.currentPeriodExtractedRows).toBeDefined();
  });

  test("documents the workspace observability endpoint with a 1-365 day range", () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    const operation =
      spec.paths["/v5/workspaces/{workspaceId}/observability"]?.get;

    expect(operation).toBeDefined();
    const days = operation.parameters.find(
      (p: { name: string }) => p.name === "days",
    );
    expect(days.description).toContain("1-365");
  });
});
