/**
 * Manual test script for test utilities.
 *
 * Run with:
 *   cd sdks/node
 *   bun run test/utils/test-utilities-manual.ts
 */

import { KadoaClient } from "../../src/kadoa-client";
import {
  deleteChannelByName,
  deleteSchemaByName,
  deleteWorkflowByName,
} from "./cleanup-helpers";
import { seedRule, seedValidation, seedWorkflow } from "./seeder";
import {
  clearFixtureCache,
  getSharedValidationFixture,
  getSharedWorkflowFixture,
} from "./shared-fixtures";
import { getTestEnv } from "./env";

// Test resource names
const TEST_WORKFLOW_NAME = "test-util-workflow-manual";
const TEST_SCHEMA_NAME = "test-util-schema-manual";
const TEST_CHANNEL_NAME = "test-util-channel-manual";
const TEST_RULE_NAME = "test-util-rule-manual";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

function printHeader(text: string): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${text}`);
  console.log(`${"=".repeat(60)}`);
}

function printTest(name: string): void {
  console.log(`\n>>> Testing: ${name}`);
}

function printPass(details?: string): void {
  const msg = details ? `    PASS - ${details}` : "    PASS";
  console.log(msg);
}

function printFail(error: string): void {
  console.log(`    FAIL - ${error}`);
}

function createTestClient(): KadoaClient {
  const env = getTestEnv();
  return new KadoaClient({ apiKey: env.KADOA_API_KEY, timeout: 60000 });
}

async function deleteRule(
  client: KadoaClient,
  workflowId: string,
  ruleId: string,
): Promise<void> {
  try {
    await client.validation.rules.bulkDeleteRules({
      workflowId,
      ruleIds: [ruleId],
    });
  } catch (e) {
    console.log(`    Warning: Failed to delete rule ${ruleId}: ${e}`);
  }
}

// =============================================================================
// Cleanup Helper Tests
// =============================================================================

async function testDeleteWorkflowByNameExists(
  client: KadoaClient,
): Promise<TestResult> {
  const result: TestResult = { name: "deleteWorkflowByName (exists)", passed: false };
  const name = `${TEST_WORKFLOW_NAME}-delete-exists`;

  try {
    // Setup: create workflow
    const workflow = await client
      .extract({
        urls: ["https://sandbox.kadoa.com/ecommerce"],
        name,
        extraction: (builder) =>
          builder.entity("Test").field("title", "Title", "STRING", { example: "Test" }),
      })
      .bypassPreview()
      .create();
    const workflowId = workflow.workflowId;
    console.log(`    Created workflow: ${workflowId}`);

    // Test: delete by name
    await deleteWorkflowByName(name, client);

    // Verify: workflow should not exist
    const found = await client.workflow.getByName(name);
    if (!found) {
      result.passed = true;
      result.details = { workflowId };
    } else {
      result.error = `Workflow still exists after deletion`;
    }
  } catch (e) {
    result.error = `${(e as Error).name}: ${(e as Error).message}`;
    console.error(e);
  }

  return result;
}

async function testDeleteWorkflowByNameNotExists(
  client: KadoaClient,
): Promise<TestResult> {
  const result: TestResult = {
    name: "deleteWorkflowByName (not exists)",
    passed: false,
  };
  const name = `${TEST_WORKFLOW_NAME}-not-exists-xyz123`;

  try {
    // Test: delete non-existent workflow (should not throw)
    await deleteWorkflowByName(name, client);
    result.passed = true;
  } catch (e) {
    result.error = `${(e as Error).name}: ${(e as Error).message}`;
    console.error(e);
  }

  return result;
}

async function testDeleteSchemaByNameExists(
  client: KadoaClient,
): Promise<TestResult> {
  const result: TestResult = { name: "deleteSchemaByName (exists)", passed: false };
  const name = `${TEST_SCHEMA_NAME}-delete-exists`;

  try {
    // Setup: create schema
    const schema = await client.schema.createSchema({
      name,
      entity: "TestEntity",
      fields: [
        {
          fieldType: "SCHEMA",
          name: "title",
          description: "Test field",
          dataType: "STRING",
          example: "Test",
        },
      ],
    });
    const schemaId = schema.id;
    console.log(`    Created schema: ${schemaId}`);

    // Test: delete by name
    await deleteSchemaByName(name, client);

    // Verify: schema should not exist
    const schemas = await client.schema.listSchemas();
    const found = schemas.find((s) => s.name === name);
    if (!found) {
      result.passed = true;
      result.details = { schemaId };
    } else {
      result.error = `Schema still exists after deletion`;
    }
  } catch (e) {
    result.error = `${(e as Error).name}: ${(e as Error).message}`;
    console.error(e);
  }

  return result;
}

async function testDeleteSchemaByNameNotExists(
  client: KadoaClient,
): Promise<TestResult> {
  const result: TestResult = {
    name: "deleteSchemaByName (not exists)",
    passed: false,
  };
  const name = `${TEST_SCHEMA_NAME}-not-exists-xyz123`;

  try {
    // Test: delete non-existent schema (should not throw)
    await deleteSchemaByName(name, client);
    result.passed = true;
  } catch (e) {
    result.error = `${(e as Error).name}: ${(e as Error).message}`;
    console.error(e);
  }

  return result;
}

async function testDeleteChannelByNameNotExists(
  client: KadoaClient,
): Promise<TestResult> {
  const result: TestResult = {
    name: "deleteChannelByName (not exists)",
    passed: false,
  };
  const name = `${TEST_CHANNEL_NAME}-not-exists-xyz123`;

  try {
    // Test: delete non-existent channel (should not throw)
    await deleteChannelByName(name, client);
    result.passed = true;
  } catch (e) {
    result.error = `${(e as Error).name}: ${(e as Error).message}`;
    console.error(e);
  }

  return result;
}

// =============================================================================
// Seeder Tests
// =============================================================================

async function testSeedWorkflowNew(client: KadoaClient): Promise<TestResult> {
  const result: TestResult = { name: "seedWorkflow (new)", passed: false };
  const name = `${TEST_WORKFLOW_NAME}-seed-new`;
  let workflowId: string | undefined;

  try {
    // Cleanup first
    await deleteWorkflowByName(name, client);

    // Test: seed new workflow
    const seeded = await seedWorkflow({ name }, client);
    workflowId = seeded.workflowId;

    if (workflowId) {
      result.passed = true;
      result.details = { workflowId };
    } else {
      result.error = "No workflowId returned";
    }
  } catch (e) {
    result.error = `${(e as Error).name}: ${(e as Error).message}`;
    console.error(e);
  } finally {
    // Cleanup
    if (workflowId) {
      await client.workflow.delete(workflowId);
    }
  }

  return result;
}

async function testSeedWorkflowExisting(
  client: KadoaClient,
): Promise<TestResult> {
  const result: TestResult = { name: "seedWorkflow (existing)", passed: false };
  const name = `${TEST_WORKFLOW_NAME}-seed-existing`;
  let firstId: string | undefined;

  try {
    // Cleanup first
    await deleteWorkflowByName(name, client);

    // Seed first time
    const first = await seedWorkflow({ name }, client);
    firstId = first.workflowId;
    console.log(`    First seed: ${firstId}`);

    // Test: seed second time (should reuse)
    const second = await seedWorkflow({ name }, client);
    const secondId = second.workflowId;
    console.log(`    Second seed: ${secondId}`);

    if (firstId === secondId) {
      result.passed = true;
      result.details = { workflowId: firstId };
    } else {
      result.error = `IDs don't match: ${firstId} != ${secondId}`;
    }
  } catch (e) {
    result.error = `${(e as Error).name}: ${(e as Error).message}`;
    console.error(e);
  } finally {
    // Cleanup
    if (firstId) {
      await client.workflow.delete(firstId);
    }
  }

  return result;
}

async function testSeedWorkflowWithJob(
  client: KadoaClient,
): Promise<TestResult> {
  const result: TestResult = { name: "seedWorkflow (with job)", passed: false };
  const name = `${TEST_WORKFLOW_NAME}-seed-job`;
  let workflowId: string | undefined;

  try {
    // Cleanup first
    await deleteWorkflowByName(name, client);

    // Test: seed with job
    const seeded = await seedWorkflow({ name, runJob: true }, client);
    workflowId = seeded.workflowId;
    const jobId = seeded.jobId;

    console.log(`    workflowId: ${workflowId}`);
    console.log(`    jobId: ${jobId}`);

    if (workflowId && jobId) {
      result.passed = true;
      result.details = { workflowId, jobId };
    } else {
      result.error = `Missing IDs: workflow=${workflowId}, job=${jobId}`;
    }
  } catch (e) {
    result.error = `${(e as Error).name}: ${(e as Error).message}`;
    console.error(e);
  } finally {
    // Cleanup
    if (workflowId) {
      await client.workflow.delete(workflowId);
    }
  }

  return result;
}

async function testSeedRuleNew(client: KadoaClient): Promise<TestResult> {
  const result: TestResult = { name: "seedRule (new)", passed: false };
  const workflowName = `${TEST_WORKFLOW_NAME}-rule-test`;
  const ruleName = `${TEST_RULE_NAME}-new`;
  let workflowId: string | undefined;
  let ruleId: string | undefined;

  try {
    // Cleanup and setup
    await deleteWorkflowByName(workflowName, client);
    const seededWf = await seedWorkflow(
      { name: workflowName, runJob: true },
      client,
    );
    workflowId = seededWf.workflowId;

    // Delete existing rule if any
    const existingRule = await client.validation.rules.getRuleByName(ruleName);
    if (existingRule?.id && existingRule?.workflowId) {
      await deleteRule(client, existingRule.workflowId, existingRule.id);
    }

    // Test: seed rule
    ruleId = await seedRule({ name: ruleName, workflowId }, client);
    console.log(`    ruleId: ${ruleId}`);

    if (ruleId) {
      result.passed = true;
      result.details = { ruleId };
    } else {
      result.error = "No ruleId returned";
    }
  } catch (e) {
    result.error = `${(e as Error).name}: ${(e as Error).message}`;
    console.error(e);
  } finally {
    // Cleanup
    if (ruleId && workflowId) {
      await deleteRule(client, workflowId, ruleId);
    }
    if (workflowId) {
      await client.workflow.delete(workflowId);
    }
  }

  return result;
}

async function testSeedRuleExisting(client: KadoaClient): Promise<TestResult> {
  const result: TestResult = { name: "seedRule (existing)", passed: false };
  const workflowName = `${TEST_WORKFLOW_NAME}-rule-reuse`;
  const ruleName = `${TEST_RULE_NAME}-existing`;
  let workflowId: string | undefined;
  let firstId: string | undefined;

  try {
    // Cleanup and setup
    await deleteWorkflowByName(workflowName, client);
    const seededWf = await seedWorkflow(
      { name: workflowName, runJob: true },
      client,
    );
    workflowId = seededWf.workflowId;

    // Delete existing rule if any
    const existingRule = await client.validation.rules.getRuleByName(ruleName);
    if (existingRule?.id && existingRule?.workflowId) {
      await deleteRule(client, existingRule.workflowId, existingRule.id);
    }

    // Seed first time
    firstId = await seedRule({ name: ruleName, workflowId }, client);
    console.log(`    First seed: ${firstId}`);

    // Debug: check what getRuleByName returns after creating
    const checkRule = await client.validation.rules.getRuleByName(ruleName);
    console.log(`    After first seed, getRuleByName returns: ${checkRule?.id}`);

    // Test: seed second time (should reuse)
    const secondId = await seedRule({ name: ruleName, workflowId }, client);
    console.log(`    Second seed: ${secondId}`);

    if (firstId === secondId) {
      result.passed = true;
      result.details = { ruleId: firstId };
    } else {
      result.error = `IDs don't match: ${firstId} != ${secondId}`;
    }
  } catch (e) {
    result.error = `${(e as Error).name}: ${(e as Error).message}`;
    console.error(e);
  } finally {
    // Cleanup
    if (firstId && workflowId) {
      await deleteRule(client, workflowId, firstId);
    }
    if (workflowId) {
      await client.workflow.delete(workflowId);
    }
  }

  return result;
}

async function testSeedValidation(client: KadoaClient): Promise<TestResult> {
  const result: TestResult = { name: "seedValidation", passed: false };
  const workflowName = `${TEST_WORKFLOW_NAME}-validation-test`;
  const ruleName = `${TEST_RULE_NAME}-validation`;
  let workflowId: string | undefined;
  let ruleId: string | undefined;

  try {
    // Cleanup and setup
    await deleteWorkflowByName(workflowName, client);
    const seededWf = await seedWorkflow(
      { name: workflowName, runJob: true },
      client,
    );
    workflowId = seededWf.workflowId;
    const jobId = seededWf.jobId;

    console.log(`    workflowId: ${workflowId}`);
    console.log(`    jobId: ${jobId}`);

    if (!jobId) {
      result.error = "No jobId from seedWorkflow";
      return result;
    }

    // Create rule first
    const existingRule = await client.validation.rules.getRuleByName(ruleName);
    if (existingRule?.id) {
      ruleId = existingRule.id;
    } else {
      ruleId = await seedRule({ name: ruleName, workflowId }, client);
    }
    console.log(`    ruleId: ${ruleId}`);

    // Test: seed validation
    const validationId = await seedValidation({ workflowId, jobId }, client);
    console.log(`    validationId: ${validationId}`);

    if (validationId) {
      result.passed = true;
      result.details = { validationId };
    } else {
      result.error = "No validationId returned";
    }
  } catch (e) {
    result.error = `${(e as Error).name}: ${(e as Error).message}`;
    console.error(e);
  } finally {
    // Cleanup
    if (ruleId && workflowId) {
      await deleteRule(client, workflowId, ruleId);
    }
    if (workflowId) {
      await client.workflow.delete(workflowId);
    }
  }

  return result;
}

// =============================================================================
// Shared Fixture Tests
// =============================================================================

async function testSharedWorkflowFixture(
  client: KadoaClient,
): Promise<TestResult> {
  const result: TestResult = { name: "getSharedWorkflowFixture", passed: false };

  try {
    // Clear cache first
    clearFixtureCache();

    // Test: get fixture
    const fixture = await getSharedWorkflowFixture(client);
    console.log(`    workflowId: ${fixture.workflowId}`);

    // Test: caching (second call should use cache)
    const fixture2 = await getSharedWorkflowFixture(client);
    console.log(`    Second call (should be cached): ${fixture2.workflowId}`);

    if (fixture.workflowId === fixture2.workflowId) {
      result.passed = true;
      result.details = { workflowId: fixture.workflowId };
    } else {
      result.error = "Caching not working";
    }

    // Note: Don't delete shared fixtures - they're meant to be reused
  } catch (e) {
    result.error = `${(e as Error).name}: ${(e as Error).message}`;
    console.error(e);
  }

  return result;
}

async function testSharedValidationFixture(
  client: KadoaClient,
): Promise<TestResult> {
  const result: TestResult = {
    name: "getSharedValidationFixture",
    passed: false,
  };

  try {
    // Clear cache first
    clearFixtureCache();

    // Test: get fixture
    const fixture = await getSharedValidationFixture(client);
    console.log(`    workflowId: ${fixture.workflowId}`);
    console.log(`    jobId: ${fixture.jobId}`);
    console.log(`    ruleId: ${fixture.ruleId}`);
    console.log(`    validationId: ${fixture.validationId}`);

    if (
      fixture.workflowId &&
      fixture.jobId &&
      fixture.ruleId &&
      fixture.validationId
    ) {
      result.passed = true;
      result.details = {
        workflowId: fixture.workflowId,
        jobId: fixture.jobId,
        ruleId: fixture.ruleId,
        validationId: fixture.validationId,
      };
    } else {
      result.error = "Missing fixture fields";
    }
  } catch (e) {
    result.error = `${(e as Error).name}: ${(e as Error).message}`;
    console.error(e);
  }

  return result;
}

// =============================================================================
// Main
// =============================================================================

async function runTests(
  testFuncs: Array<(client: KadoaClient) => Promise<TestResult>>,
  client: KadoaClient,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (const testFunc of testFuncs) {
    printTest(testFunc.name);
    const result = await testFunc(client);
    results.push(result);
    if (result.passed) {
      printPass(result.details ? JSON.stringify(result.details) : undefined);
    } else {
      printFail(result.error ?? "Unknown error");
    }
  }
  return results;
}

async function main(): Promise<number> {
  printHeader("Test Utilities Manual Test (Node.js)");
  const client = createTestClient();

  const allResults: TestResult[] = [];

  // Cleanup Helper Tests
  printHeader("1. Cleanup Helper Tests");
  const cleanupTests = [
    testDeleteWorkflowByNameExists,
    testDeleteWorkflowByNameNotExists,
    testDeleteSchemaByNameExists,
    testDeleteSchemaByNameNotExists,
    testDeleteChannelByNameNotExists,
  ];
  allResults.push(...(await runTests(cleanupTests, client)));

  // Seeder Tests
  printHeader("2. Seeder Tests");
  const seederTests = [
    testSeedWorkflowNew,
    testSeedWorkflowExisting,
    testSeedWorkflowWithJob,
    testSeedRuleNew,
    testSeedRuleExisting,
    testSeedValidation,
  ];
  allResults.push(...(await runTests(seederTests, client)));

  // Shared Fixture Tests
  printHeader("3. Shared Fixture Tests");
  const fixtureTests = [testSharedWorkflowFixture, testSharedValidationFixture];
  allResults.push(...(await runTests(fixtureTests, client)));

  // Summary
  printHeader("Summary");
  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.filter((r) => !r.passed).length;
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${allResults.length}`);

  if (failed > 0) {
    console.log("\nFailed tests:");
    for (const r of allResults) {
      if (!r.passed) {
        console.log(`  - ${r.name}: ${r.error}`);
      }
    }
  }

  client.dispose();
  return failed > 0 ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
