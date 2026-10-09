import type { KadoaClient } from "../../src";
import type { CreateSchemaRequest } from "../../src/domains/schemas/schemas.acl";

export const seedSchema = async (
  request: CreateSchemaRequest,
  client: KadoaClient,
): Promise<{ schemaId: string }> => {
  console.log(`[Seeder] Seeding schema: ${request.name}`);
  const schemas = await client.schema.listSchemas();
  const existing = schemas.find((s) => s.name === request.name);
  if (existing?.id) {
    console.log(
      `[Seeder] Schema ${request.name} already exists: ${existing.id}`,
    );
    return { schemaId: existing.id };
  }

  const schema = await client.schema.createSchema(request);
  console.log(`[Seeder] Schema ${request.name} seeded: ${schema.id}`);
  return { schemaId: schema.id };
};

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
