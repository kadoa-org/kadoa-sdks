import type { KadoaClient } from "../../src";

export const seedWorkflow = async (
  {
    name,
    runJob = false,
    additionalData,
  }: {
    name: string;
    runJob?: boolean;
    additionalData?: Record<string, unknown>;
  },
  client: KadoaClient,
): Promise<{ workflowId: string; jobId?: string }> => {
  console.log(`[Seeder] Seeding workflow: ${name}`);
  const existingWorkflow = await client.workflow.getByName(name);
  if (existingWorkflow?.id) {
    console.log(
      `[Seeder] Workflow ${name} already exists: ${existingWorkflow.id}`,
    );

    if (runJob && !existingWorkflow.jobId) {
      const job = await client.extraction.runJob(existingWorkflow.id, {
        limit: 10,
      });
      console.log(`[Seeder] Job ${name} seeded: ${job.jobId}`);
      return {
        workflowId: existingWorkflow.id,
        jobId: job.jobId,
      };
    }

    return {
      workflowId: existingWorkflow.id,
      jobId: existingWorkflow.jobId,
    };
  }

  const workflow = await client
    .extract({
      name,
      urls: ["https://sandbox.kadoa.com/careers"],
      bypassPreview: true,
      additionalData,
    })
    .create();

  console.log(`[Seeder] Workflow ${name} seeded: ${workflow.workflowId}`);
  if (runJob) {
    const job = await client.extraction.runJob(workflow.workflowId, {
      limit: 10,
    });
    console.log(`[Seeder] Job ${name} seeded: ${job.jobId}`);
    return {
      workflowId: workflow.workflowId,
      jobId: job.jobId,
    };
  } else {
    const createdWorkflow = await client.workflow.getByName(name);
    if (!createdWorkflow?.id) {
      throw new Error(`[Seeder] This should never happen`);
    }
    return {
      workflowId: createdWorkflow.id,
    };
  }
};

export const seedRule = async (
  { name, workflowId }: { name: string; workflowId: string },
  client: KadoaClient,
): Promise<string> => {
  console.log(`[Seeder] Seeding rule: ${name}`);
  const existingRule = await client.validation.rules.getRuleByName(name);
  if (existingRule?.id) {
    console.log(`[Seeder] Rule ${name} already exists: ${existingRule.id}`);
    return existingRule.id;
  }

  const rule = await client.validation.rules.createRule({
    name,
    description: "Test rule",
    ruleType: "custom_sql",
    status: "enabled",
    parameters: {
      sql: `SELECT __id__, 'title' AS __column__, 'LENGTH_MAX' AS __type__, "title" AS __bad_value__ FROM _src WHERE "title" IS NOT NULL AND LENGTH("title") > 15`,
    },
    workflowId,
    targetColumns: ["title"],
  });
  console.log(`[Seeder] Rule ${name} seeded: ${rule.id}`);
  return rule.id;
};

export const seedValidation = async (
  { workflowId, jobId }: { workflowId: string; jobId: string },
  client: KadoaClient,
): Promise<string> => {
  console.log(`[Seeder] Seeding validation: ${workflowId}`);

  const existingValidation = await client.validation.getLatest(
    workflowId,
    jobId,
  );

  // Reuse if exists, has no error, and has anomalies
  if (
    existingValidation?.id &&
    !existingValidation.error &&
    existingValidation.anomaliesCountTotal > 0
  ) {
    console.log(
      `[Seeder] Found existing validation: ${existingValidation.id} [anomalies: ${existingValidation.anomaliesCountTotal}]`,
    );
    return existingValidation.id;
  }

  // Log warning if existing validation has issues
  if (existingValidation?.error) {
    console.warn(
      `[Seeder] Existing validation has error: ${existingValidation.error}. Scheduling new validation...`,
    );
  } else if (existingValidation?.anomaliesCountTotal === 0) {
    console.warn(
      `[Seeder] Existing validation has no anomalies. Scheduling new validation...`,
    );
  }

  const result = await client.validation.schedule(workflowId, jobId);
  // Wait for validation record to be created before polling
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await client.validation.waitUntilCompleted(result.validationId, {
    pollIntervalMs: 2000,
  });
  return result.validationId;
};
