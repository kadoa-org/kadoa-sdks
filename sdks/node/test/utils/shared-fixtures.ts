/**
 * Shared Fixtures for Read-Only Tests
 *
 * Use these utilities for tests that only read data.
 * Fixtures are seeded once and reused across test runs.
 *
 * @example
 * ```typescript
 * import { getSharedWorkflowFixture } from "../utils/shared-fixtures";
 *
 * describe("Workflows", () => {
 *   let fixture: SharedWorkflowFixture;
 *
 *   beforeAll(async () => {
 *     fixture = await getSharedWorkflowFixture(client);
 *   });
 *
 *   test("gets the workflow", async () => {
 *     const workflow = await client.workflow.get(fixture.workflowId);
 *     expect(workflow.id).toBe(fixture.workflowId);
 *   });
 * });
 * ```
 */

import type { KadoaClient } from "../../src";
import { seedWorkflow } from "./seeder";

// ============================================================================
// Types
// ============================================================================

export interface SharedWorkflowFixture {
  workflowId: string;
  jobId?: string;
}

// ============================================================================
// Fixture Names (deterministic, idempotent)
// ============================================================================

const FIXTURE_NAMES = {
  WORKFLOW_READ_ONLY: "shared-fixture-workflow-readonly",
} as const;

// ============================================================================
// Singleton Cache (with promise locks to prevent race conditions)
// ============================================================================

let workflowFixtureCache: SharedWorkflowFixture | null = null;
let workflowFixturePromise: Promise<SharedWorkflowFixture> | null = null;

// ============================================================================
// Public API
// ============================================================================

/**
 * Get shared workflow fixture for read-only workflow tests.
 *
 * Seeds workflow once. Subsequent calls return cached fixture.
 * Safe for parallel test execution - uses promise lock to prevent duplicate seeding.
 */
export async function getSharedWorkflowFixture(
  client: KadoaClient,
  options?: { runJob?: boolean },
): Promise<SharedWorkflowFixture> {
  if (workflowFixtureCache) {
    console.log("[SharedFixture] Using cached workflow fixture");
    return workflowFixtureCache;
  }

  // Use promise lock to prevent concurrent seeding
  if (workflowFixturePromise) {
    console.log("[SharedFixture] Waiting for workflow fixture seeding...");
    return workflowFixturePromise;
  }

  workflowFixturePromise = (async () => {
    console.log("[SharedFixture] Seeding workflow fixture...");

    const { workflowId, jobId } = await seedWorkflow(
      { name: FIXTURE_NAMES.WORKFLOW_READ_ONLY, runJob: options?.runJob },
      client,
    );

    workflowFixtureCache = { workflowId, jobId };

    console.log(
      "[SharedFixture] Workflow fixture ready:",
      workflowFixtureCache,
    );
    return workflowFixtureCache;
  })();

  return workflowFixturePromise;
}

/**
 * Clear fixture caches.
 *
 * Call this in test teardown hooks or watch mode to reset fixtures.
 * Useful when fixtures get corrupted or need to be refreshed.
 *
 * @example
 * ```typescript
 * afterAll(() => {
 *   clearFixtureCache();
 * });
 * ```
 */
export function clearFixtureCache(): void {
  workflowFixtureCache = null;
  workflowFixturePromise = null;
  console.log("[SharedFixture] Cache cleared");
}
