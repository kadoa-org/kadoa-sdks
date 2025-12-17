import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient } from "../../src/kadoa-client";
import { KadoaHttpException } from "../../src/runtime/exceptions";
import { getTestEnv } from "../utils/env";
import { seedWorkflow } from "../utils/seeder";

describe("Workflows", () => {
  const env = getTestEnv();
  let client: KadoaClient;

  beforeAll(() => {
    client = new KadoaClient({
      apiKey: env.KADOA_API_KEY,
      timeout: 30000,
    });
  });

  afterAll(() => {
    client?.dispose();
  });

  describe("Update Operations", () => {
    test(
      "should update limit",
      async () => {
        // Create isolated workflow for update test
        const { workflowId } = await seedWorkflow(
          { name: `test-update-limit-${Date.now()}` },
          client,
        );

        try {
          const result = await client.workflow.update(workflowId, {
            limit: 100,
          });
          expect(result.success).toBe(true);

          const workflow = await client.workflow.get(workflowId);
          expect(workflow).toBeDefined();
          expect(result.message).toBeDefined();
        } finally {
          await client.workflow.delete(workflowId);
        }
      },
      { timeout: 60000 },
    );

    test(
      "should update name",
      async () => {
        // Create isolated workflow for update test
        const { workflowId } = await seedWorkflow(
          { name: `test-update-name-${Date.now()}` },
          client,
        );

        try {
          const result = await client.workflow.update(workflowId, {
            name: "Updated Workflow Name",
          });
          expect(result.success).toBe(true);

          const workflow = await client.workflow.get(workflowId);
          expect(workflow.name).toBe("Updated Workflow Name");
        } finally {
          await client.workflow.delete(workflowId);
        }
      },
      { timeout: 60000 },
    );

    test(
      "should validate additionalData on update",
      async () => {
        // Create isolated workflow for update test
        const { workflowId } = await seedWorkflow(
          { name: `test-update-additional-data-${Date.now()}` },
          client,
        );

        try {
          const { KadoaSdkException } = await import(
            "../../src/runtime/exceptions"
          );

          // Test invalid additionalData (array)
          expect(
            client.workflow.update(workflowId, {
              additionalData: ["invalid"],
            }),
          ).rejects.toThrow(KadoaSdkException);

          // Test invalid additionalData (null)
          expect(
            client.workflow.update(workflowId, {
              additionalData: null,
            }),
          ).rejects.toThrow(KadoaSdkException);

          // Test valid additionalData
          const validData = { testKey: "testValue", nested: { count: 1 } };
          const result = await client.workflow.update(workflowId, {
            additionalData: validData,
          });
          expect(result.success).toBe(true);

          // Verify additionalData was updated
          const workflow = await client.workflow.get(workflowId);
          expect(workflow.additionalData).toEqual(validData);
        } finally {
          await client.workflow.delete(workflowId);
        }
      },
      { timeout: 60000 },
    );
  });

  describe("Destructive Operations", () => {
    test(
      "should delete workflow",
      async () => {
        // Create isolated workflow for deletion
        const { workflowId } = await seedWorkflow(
          { name: `test-workflow-delete-${Date.now()}` },
          client,
        );

        await client.workflow.delete(workflowId);

        // Verify workflow is deleted (soft delete - state should be DELETED)
        const deletedWorkflow = await client.workflow.get(workflowId);
        expect(deletedWorkflow.state).toBe("DELETED");

        // Verify workflow is not returned in list
        const workflows = await client.workflow.list();
        const foundWorkflow = workflows.find((w) => w.id === workflowId);
        expect(foundWorkflow).toBeUndefined();
      },
      { timeout: 120000 },
    );

    test(
      "should handle delete non-existent workflow",
      async () => {
        expect(
          client.workflow.delete("5f9f1b9b9c9d1b9b9c9d1b9b"),
        ).rejects.toThrow(KadoaHttpException);
      },
      { timeout: 60000 },
    );
  });
});
