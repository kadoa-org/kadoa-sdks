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
});
