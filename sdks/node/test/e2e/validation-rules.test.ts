import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { getE2ETestEnv } from "../utils/env";
import { KadoaClient } from "../../src/kadoa-client";
import { seedRule, seedWorkflow } from "../utils/seeder";

describe("Data Validation Rules", () => {
	let client: KadoaClient;
	const env = getE2ETestEnv();
	let workflowId: string;
	let ruleId: string;

	beforeAll(async () => {
		client = new KadoaClient({
			apiKey: env.KADOA_API_KEY,
			timeout: 30000,
		});

		const result = await seedWorkflow({ name: "test-workflow-1" }, client);
		workflowId = result.workflowId;
		ruleId = await seedRule({ name: "test-rule-1", workflowId }, client);
	});

	afterAll(() => {
		if (client) {
			client.dispose();
		}
	});

	test(
		"should have enabled validation by default",
		async () => {
			const result = await client.workflow.getByName("test-workflow-1");

			expect(result).toBeDefined();
			expect(result?.dataValidation?.enabled).toBe(true);
		},
		{ timeout: 60000 },
	);

	test("should create a validation rule", async () => {
		const result = await client.validation.createRule({
			name: "test-rule-2",
			description: "Test rule 2",
			ruleType: "custom_sql",
			parameters: {
				sql: "SELECT __id__, 'title' AS __column__, 'FORMAT' AS __type__, \"title\" AS __bad_value__ FROM _src WHERE \"title\" IS NULL OR TRIM(\"title\") = ''",
			},
			workflowId,
			targetColumns: ["title"],
		});

		expect(result).toBeDefined();
	});

	test("shoul return list of rules", async () => {
		const result = await client.validation.listRules({
			workflowId,
		});

		expect(result).toBeDefined();
		expect(result?.data.length).toBeGreaterThan(0);
	});

	test("should generate single rule using natural language", async () => {
		const result = await client.validation.generateRule({
			workflowId,
			selectedColumns: ["title"],
			userPrompt: "Ensure the title is not empty",
		});

		expect(result).toBeDefined();
	});

	test(
		"should generate multiple rules using generated intents from schema",
		async () => {
			const result = await client.validation.generateRules({
				workflowId,
			});

			expect(result).toBeDefined();
			expect(result?.length).toBeGreaterThan(0);
		},
		{ timeout: 60000 },
	);

	test("should bulk approve rules", async () => {
		const result = await client.validation.bulkApproveRules({
			workflowId,
			ruleIds: [ruleId],
		});

		expect(result).toBeDefined();
	});

	test("should bulk delete rules", async () => {
		const result = await client.validation.bulkDeleteRules({
			workflowId,
			ruleIds: [ruleId],
		});

		expect(result).toBeDefined();
	});

	//todo: uncomment this when API is updated
	// test.skip("should delete all rules", async () => {
	// 	const result = await client.validation.deleteAllRules({
	// 		// workflowId,
	// 	});
	// });
});
