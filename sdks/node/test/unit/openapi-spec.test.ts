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

  test("includes bounded public scrape response discovery", () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    const request = spec.paths["/v4/scrape"].post.requestBody.content["application/json"].schema;
    const response = spec.paths["/v4/scrape"].post.responses["200"].content["application/json"].schema;

    expect(request.properties.discoverResponses.type).toBe("boolean");
    expect(response.properties.capturedResponses.items.properties).toMatchObject({
      method: { type: "string" },
      resourceType: { type: "string" },
      contentType: { type: "string" },
      sizeBytes: { type: "integer" },
      bodyTruncated: { type: "boolean" },
    });
  });
});
