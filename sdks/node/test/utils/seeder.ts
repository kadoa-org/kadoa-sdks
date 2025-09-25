import type { KadoaClient } from "../../src";

export const seedWorkflow = async (
	{ name }: { name: string },
	client: KadoaClient,
): Promise<{ workflowId: string; jobId: string }> => {
	console.log(`[Seeder] Seeding workflow: ${name}`);
	const existingWorkflow = await client.workflow.getByName(name);
	if (existingWorkflow?._id && !existingWorkflow.jobId) {
		throw new Error(`[Seeder] This should never happen`);
	} else if (existingWorkflow?._id && existingWorkflow.jobId) {
		console.log(
			`[Seeder] Workflow ${name} already exists: ${existingWorkflow._id}`,
		);
		return {
			workflowId: existingWorkflow._id,
			jobId: existingWorkflow.jobId,
		};
	}

	const workflow = await client.extraction.run({
		name,
		entity: "ai-detection",
		urls: ["https://sandbox.kadoa.com/careers"],
		bypassPreview: true,
	});
	console.log(`[Seeder] Workflow ${name} seeded: ${workflow.workflowId}`);

	const createdWorkflow = await client.workflow.getByName(name);
	if (!createdWorkflow?._id || !createdWorkflow.jobId) {
		throw new Error(`[Seeder] This should never happen`);
	}

	return {
		workflowId: createdWorkflow._id,
		jobId: createdWorkflow.jobId,
	};
};

export const seedRule = async (
	{ name, workflowId }: { name: string; workflowId: string },
	client: KadoaClient,
): Promise<string> => {
	console.log(`[Seeder] Seeding rule: ${name}`);
	const existingRule = await client.validation.getRuleByName(name);
	if (existingRule?.id) {
		console.log(`[Seeder] Rule ${name} already exists: ${existingRule.id}`);
		return existingRule.id;
	}

	const rule = await client.validation.createRule({
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

	const existingValidation = await client.validation.getLatestValidation(
		workflowId,
		jobId,
	);
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

	const result = await client.validation.scheduleValidation(workflowId, jobId);
	//i am lazy to implement validation status polling so we will wait for 1 second
	await Promise.resolve(new Promise((resolve) => setTimeout(resolve, 1000)));
	return result.validationId;
};
