import type { KadoaClient } from "../../src";

export const seedWorkflow = async (
	{ name }: { name: string },
	client: KadoaClient,
): Promise<string> => {
	console.log(`[Seeder] Seeding workflow: ${name}`);
	const existingWorkflow = await client.workflow.getByName(name);
	if (existingWorkflow?._id) {
		console.log(
			`[Seeder] Workflow ${name} already exists: ${existingWorkflow._id}`,
		);
		return existingWorkflow._id;
	}

	const workflow = await client.extraction.run({
		name,
		entity: "ai-detection",
		urls: ["https://sandbox.kadoa.com/careers"],
		bypassPreview: true,
	});
	console.log(`[Seeder] Workflow ${name} seeded: ${workflow.workflowId}`);
	return workflow.workflowId;
};
