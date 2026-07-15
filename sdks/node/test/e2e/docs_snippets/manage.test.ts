/**
 * TS-WORKFLOWS-MANAGE: manage.mdx snippets
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient } from "../../../src/kadoa-client";
import { getTestEnv } from "../../utils/env";
import { seedWorkflow } from "../../utils/seeder";

describe("TS-WORKFLOWS-MANAGE: manage.mdx snippets", () => {
  let client: KadoaClient;
  let workflowId: string;
  const workflowIds = new Set<string>();

  beforeAll(async () => {
    client = new KadoaClient({ apiKey: getTestEnv().KADOA_API_KEY });
    const createWorkflow = client.workflow.create.bind(client.workflow);
    client.workflow.create = (async (input) => {
      const workflow = await createWorkflow(input);
      workflowIds.add(workflow.id);
      return workflow;
    }) as typeof client.workflow.create;
    ({ workflowId } = await seedWorkflow(
      { name: `docs-manage-${Date.now()}` },
      client,
    ));
  });

  afterAll(async () => {
    try {
      const results = await Promise.allSettled(
        [...workflowIds].map((id) => client.workflow.delete(id)),
      );
      const failures = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      if (failures.length > 0) {
        throw new AggregateError(
          failures.map((failure) => failure.reason),
          "Failed to delete one or more workflow fixtures",
        );
      }
    } finally {
      client?.dispose?.();
    }
  });

  test("TS-WORKFLOWS-MANAGE-001: list workflows", async () => {
    // @docs-preamble TS-WORKFLOWS-MANAGE-001
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // @docs-preamble-end TS-WORKFLOWS-MANAGE-001

    // @docs-start TS-WORKFLOWS-MANAGE-001
    const workflows = await client.workflow.list({ limit: 100 });

    for (const workflow of workflows) {
      console.log(`${workflow.id}: ${workflow.name}`);
    }
    // @docs-end TS-WORKFLOWS-MANAGE-001

    expect(Array.isArray(workflows)).toBe(true);
  });

  test("TS-WORKFLOWS-MANAGE-002: get a workflow", async () => {
    // @docs-preamble TS-WORKFLOWS-MANAGE-002
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const workflowId = "YOUR_WORKFLOW_ID";
    // @docs-preamble-end TS-WORKFLOWS-MANAGE-002

    // @docs-start TS-WORKFLOWS-MANAGE-002
    const workflow = await client.workflow.get(workflowId);
    // @docs-end TS-WORKFLOWS-MANAGE-002

    expect(workflow.id).toBe(workflowId);
  });

  test("TS-WORKFLOWS-MANAGE-003: pause and resume", async () => {
    let deadline = Date.now() + 30 * 60 * 1000;
    let seededWorkflow = await client.workflow.get(workflowId);
    while (
      ["RUNNING", "VALIDATING"].includes(seededWorkflow.displayState ?? "") &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      seededWorkflow = await client.workflow.get(workflowId);
    }
    if (seededWorkflow.state !== "ACTIVE") {
      await client.workflow.resume(workflowId);
      deadline = Date.now() + 30 * 60 * 1000;
    }
    while (
      (seededWorkflow.state !== "ACTIVE" ||
        ["RUNNING", "VALIDATING"].includes(
          seededWorkflow.displayState ?? "",
        )) &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      seededWorkflow = await client.workflow.get(workflowId);
    }
    expect(seededWorkflow.state).toBe("ACTIVE");
    expect(["RUNNING", "VALIDATING"]).not.toContain(
      seededWorkflow.displayState,
    );

    // @docs-preamble TS-WORKFLOWS-MANAGE-003
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const workflowId = "YOUR_WORKFLOW_ID";
    // @docs-preamble-end TS-WORKFLOWS-MANAGE-003

    // @docs-start TS-WORKFLOWS-MANAGE-003
    await client.workflow.pause(workflowId);
    await client.workflow.resume(workflowId);
    // @docs-end TS-WORKFLOWS-MANAGE-003

    expect(await client.workflow.get(workflowId)).toBeDefined();
  });

  test("TS-WORKFLOWS-MANAGE-004: delete a workflow", async () => {
    const seeded = await seedWorkflow(
      { name: `docs-manage-delete-${Date.now()}` },
      client,
    );
    const workflowId = seeded.workflowId;

    // @docs-preamble TS-WORKFLOWS-MANAGE-004
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const workflowId = "YOUR_WORKFLOW_ID";
    // @docs-preamble-end TS-WORKFLOWS-MANAGE-004

    // @docs-start TS-WORKFLOWS-MANAGE-004
    await client.workflow.delete(workflowId);
    // @docs-end TS-WORKFLOWS-MANAGE-004

    expect((await client.workflow.get(workflowId)).state).toBe("DELETED");
    workflowIds.delete(workflowId);
  });

  test("TS-WORKFLOWS-MANAGE-005: fetch all workflow data", async () => {
    const listWorkflows = client.workflow.list.bind(client.workflow);
    client.workflow.list = (async () => [
      await client.workflow.get(workflowId),
    ]) as typeof client.workflow.list;

    // @docs-preamble TS-WORKFLOWS-MANAGE-005
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // @docs-preamble-end TS-WORKFLOWS-MANAGE-005

    // @docs-start TS-WORKFLOWS-MANAGE-005
    const workflows = await client.workflow.list({ limit: 100 });

    for (const workflow of workflows) {
      if (!workflow.id) continue;
      const data = await client.extraction.fetchAllData({
        workflowId: workflow.id,
      });
      console.log(`${workflow.name}: ${data.length} records`);
    }
    // @docs-end TS-WORKFLOWS-MANAGE-005

    client.workflow.list = listWorkflows;

    expect(Array.isArray(workflows)).toBe(true);
  });

  test("TS-WORKFLOWS-MANAGE-006: update a workflow", async () => {
    // @docs-preamble TS-WORKFLOWS-MANAGE-006
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const workflowId = "YOUR_WORKFLOW_ID";
    // @docs-preamble-end TS-WORKFLOWS-MANAGE-006

    // @docs-start TS-WORKFLOWS-MANAGE-006
    const updated = await client.workflow.update(workflowId, {
      name: "New Name",
      updateInterval: "DAILY",
    });
    // @docs-end TS-WORKFLOWS-MANAGE-006

    expect(updated.success).toBe(true);
  });
});
