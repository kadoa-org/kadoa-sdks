import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { getE2ETestEnv } from "../utils/env";
import { KadoaClient } from "../../src/kadoa-client";
import { seedRule, seedValidation, seedWorkflow } from "../utils/seeder";
import assert from "node:assert";

describe("Data Validation", () => {
	let client: KadoaClient;
	const env = getE2ETestEnv();
	let workflowId: string;
	let ruleId: string;
	let validationId: string;
	let jobId: string;

	beforeAll(async () => {
		client = new KadoaClient({
			apiKey: env.KADOA_API_KEY,
			timeout: 30000,
		});

		const result = await seedWorkflow(
			{
				name: "test-workflow-1",
				runJob: true,
			},
			client,
		);
		workflowId = result.workflowId;
		assert(result.jobId, "Job ID is not set");
		jobId = result.jobId;
		ruleId = await seedRule({ name: "test-rule-1", workflowId }, client);
		validationId = await seedValidation({ workflowId, jobId }, client);
	});

	afterAll(() => {
		if (client) {
			client.dispose();
		}
	});

	describe("Validation submission", () => {
		test("should list all workflow validations", async () => {
			const result = await client.validation.listWorkflowValidations(
				workflowId,
				jobId,
			);
			expect(result).toBeDefined();
			expect(result?.data.length).toBeGreaterThan(0);
		});

		test("should get validation details using validationId", async () => {
			const result = await client.validation.getValidationDetails(validationId);
			expect(result).toBeDefined();
			expect(result?.id).toBe(validationId);
			expect(result?.workflowId).toBe(workflowId);
			expect(result?.jobId).toBe(jobId);
		});

		test("should get latest validation using only workflowId", async () => {
			const result = await client.validation.getLatestValidation(workflowId);
			expect(result).toBeDefined();
			expect(result?.workflowId).toBe(workflowId);
			-expect(result?.jobId).toBe(jobId);
		});

		test("should get latest validation using workflowId and jobId", async () => {
			const result = await client.validation.getLatestValidation(
				workflowId,
				jobId,
			);
			expect(result).toBeDefined();
			expect(result?.workflowId).toBe(workflowId);
			expect(result?.jobId).toBe(jobId);
		});

		test("should get validation anomalies using validationId", async () => {
			const result =
				await client.validation.getValidationAnomalies(validationId);
			expect(result).toBeDefined();
			expect(result?.anomaliesByRule).toBeDefined();
			expect(result?.anomaliesByRule.length).toBeGreaterThan(0);
		});

		test("should get validation anomalies by rule using validationId and ruleName", async () => {
			const result = await client.validation.getValidationAnomaliesByRule(
				validationId,
				"test-rule-1",
			);
			expect(result).toBeDefined();
			expect(result?.ruleName).toBe("test-rule-1");
			expect(result?.anomalies).toBeDefined();
			expect(result?.anomalies.length).toBeGreaterThan(0);
		});
	});
});
