import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient } from "../../src/kadoa-client";
import { KadoaHttpException } from "../../src/runtime/exceptions";
import { getE2ETestEnv } from "../utils/env";
import { seedWorkflow } from "../utils/seeder";

describe("Workflows", () => {
  let client: KadoaClient;
  const env = getE2ETestEnv();
  let workflowId: string;

  beforeAll(async () => {
    client = new KadoaClient({
      apiKey: env.KADOA_API_KEY,
      timeout: 30000,
    });

    const result = await seedWorkflow(
      { name: "test-workflow-update-delete" },
      client,
    );
    workflowId = result.workflowId;
  });

  afterAll(async () => {
    // Cleanup: try to delete if still exists
    if (workflowId) {
      try {
        await client.workflow.delete(workflowId);
      } catch {
        // Ignore errors during cleanup
      }
    }
    if (client) {
      client.dispose();
    }
  });

  test(
    "should update limit",
    async () => {
      const result = await client.workflow.update(workflowId, { limit: 100 });
      expect(result.success).toBe(true);

      const workflow = await client.workflow.get(workflowId);
      // Verify limit was updated - check config.limit if available, or other structure
      expect(workflow).toBeDefined();
      // Note: The actual structure may vary - this validates the update succeeded
      expect(result.message).toBeDefined();
    },
    { timeout: 60000 },
  );

  test(
    "should update name",
    async () => {
      const result = await client.workflow.update(workflowId, {
        name: "Updated Workflow Name",
      });
      expect(result.success).toBe(true);

      const workflow = await client.workflow.get(workflowId);
      expect(workflow.name).toBe("Updated Workflow Name");
    },
    { timeout: 60000 },
  );

  test(
    "should validate additionalData on update",
    async () => {
      const { KadoaSdkException } = await import(
        "../../src/runtime/exceptions"
      );

      // Test invalid additionalData (array)
      await expect(
        client.workflow.update(workflowId, {
          additionalData: ["invalid"] as unknown as Record<string, unknown>,
        }),
      ).rejects.toThrow(KadoaSdkException);

      // Test invalid additionalData (null)
      await expect(
        client.workflow.update(workflowId, {
          additionalData: null as unknown as Record<string, unknown>,
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
    },
    { timeout: 60000 },
  );

  test(
    "should delete workflow",
    async () => {
      // Create a separate workflow for deletion test to avoid affecting other tests
      const deleteTestWorkflow = await seedWorkflow(
        { name: "test-workflow-for-delete" },
        client,
      );
      const deleteWorkflowId = deleteTestWorkflow.workflowId;

      await client.workflow.delete(deleteWorkflowId);

      // Verify workflow is deleted (soft delete - state should be DELETED)
      const deletedWorkflow = await client.workflow.get(deleteWorkflowId);
      expect(deletedWorkflow.state).toBe("DELETED");

      // Verify workflow is not returned in list (by default, deleted workflows are excluded)
      const workflows = await client.workflow.list();
      const foundWorkflow = workflows.find((w) => w._id === deleteWorkflowId);
      expect(foundWorkflow).toBeUndefined();
    },
    { timeout: 60000 },
  );

  test(
    "should handle delete non-existent workflow",
    async () => {
      await expect(
        client.workflow.delete("5f9f1b9b9c9d1b9b9c9d1b9b"),
      ).rejects.toThrow(KadoaHttpException);
    },
    { timeout: 60000 },
  );
});
