/**
 * Shared Fixtures for Read-Only Tests
 *
 * Use these utilities for tests that only read data.
 * Fixtures are seeded once and reused across test runs.
 *
 * @example
 * ```typescript
 * import { getSharedValidationFixture } from "../utils/shared-fixtures";
 *
 * describe("Validation Core", () => {
 *   let fixture: SharedValidationFixture;
 *
 *   beforeAll(async () => {
 *     fixture = await getSharedValidationFixture(client);
 *   });
 *
 *   test("lists validations", async () => {
 *     const result = await client.validation.list({ workflowId: fixture.workflowId });
 *     expect(result.data.length).toBeGreaterThan(0);
 *   });
 * });
 * ```
 */

import type { KadoaClient } from "../../src";
import { seedRule, seedValidation, seedWorkflow } from "./seeder";

// ============================================================================
// Types
// ============================================================================

export interface SharedValidationFixture {
  workflowId: string;
  jobId: string;
  ruleId: string;
  ruleName: string;
  validationId: string;
  /** Available column names from workflow schema */
  columns: string[];
}

export interface SharedWorkflowFixture {
  workflowId: string;
  jobId?: string;
}

// ============================================================================
// Fixture Names (deterministic, idempotent)
// ============================================================================

const FIXTURE_NAMES = {
  VALIDATION_WORKFLOW: "shared-fixture-validation",
  VALIDATION_RULE: "shared-fixture-validation-rule",
  WORKFLOW_READ_ONLY: "shared-fixture-workflow-readonly",
} as const;

// ============================================================================
// Singleton Cache
// ============================================================================

let validationFixtureCache: SharedValidationFixture | null = null;
let workflowFixtureCache: SharedWorkflowFixture | null = null;

// ============================================================================
// Public API
// ============================================================================

/**
 * Get shared validation fixture for read-only tests.
 *
 * Seeds workflow, rule, and validation once. Subsequent calls return cached fixture.
 * Safe for parallel test execution - all tests read from same fixture.
 */
export async function getSharedValidationFixture(
  client: KadoaClient,
): Promise<SharedValidationFixture> {
  if (validationFixtureCache) {
    console.log("[SharedFixture] Using cached validation fixture");
    return validationFixtureCache;
  }

  console.log("[SharedFixture] Seeding validation fixture...");

  const { workflowId, jobId } = await seedWorkflow(
    { name: FIXTURE_NAMES.VALIDATION_WORKFLOW, runJob: true },
    client,
  );

  if (!jobId) {
    throw new Error("[SharedFixture] Failed to seed workflow with job");
  }

  const ruleId = await seedRule(
    { name: FIXTURE_NAMES.VALIDATION_RULE, workflowId },
    client,
  );

  const validationId = await seedValidation({ workflowId, jobId }, client);

  // Fetch schema columns for dynamic test assertions
  const workflow = await client.workflow.get(workflowId);
  const columns = (workflow.schema ?? [])
    .map((field) => field.name)
    .filter((name): name is string => !!name);

  if (columns.length === 0) {
    console.warn("[SharedFixture] No schema columns found for workflow");
  }

  validationFixtureCache = {
    workflowId,
    jobId,
    ruleId,
    ruleName: FIXTURE_NAMES.VALIDATION_RULE,
    validationId,
    columns,
  };

  console.log(
    "[SharedFixture] Validation fixture ready:",
    validationFixtureCache,
  );
  return validationFixtureCache;
}

/**
 * Get shared workflow fixture for read-only workflow tests.
 *
 * Seeds workflow once. Subsequent calls return cached fixture.
 * Use for tests that only read workflow data (get, list, getByName).
 */
export async function getSharedWorkflowFixture(
  client: KadoaClient,
  options?: { runJob?: boolean },
): Promise<SharedWorkflowFixture> {
  if (workflowFixtureCache) {
    console.log("[SharedFixture] Using cached workflow fixture");
    return workflowFixtureCache;
  }

  console.log("[SharedFixture] Seeding workflow fixture...");

  const { workflowId, jobId } = await seedWorkflow(
    { name: FIXTURE_NAMES.WORKFLOW_READ_ONLY, runJob: options?.runJob },
    client,
  );

  workflowFixtureCache = { workflowId, jobId };

  console.log("[SharedFixture] Workflow fixture ready:", workflowFixtureCache);
  return workflowFixtureCache;
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
  validationFixtureCache = null;
  workflowFixtureCache = null;
  console.log("[SharedFixture] Cache cleared");
}
