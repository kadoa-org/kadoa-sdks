import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { getVCRTestEnv } from "../utils/env";
import {
	createVCRClient,
	requireVCRCache,
	type VCRKadoaClient,
	VCRUtils,
} from "../utils/vcr";

/**
 * Integration test using VCR for extraction submit workflow
 *
 * Run modes:
 * - VCR_MODE=record - Makes real API calls and saves responses
 * - VCR_MODE=replay - Uses only cached responses (fails if cache missing)
 * - VCR_MODE=auto   - Uses cache if exists, records if not (default)
 *
 * @example
 * ```bash
 * # First run - record real API responses
 * VCR_MODE=record bun test test/integration/submit-extraction.test.ts
 *
 * # Subsequent runs - use cached responses
 * VCR_MODE=replay bun test test/integration/submit-extraction.test.ts
 * ```
 */

const CACHE_DIR = "test/fixtures/vcr-cache/submit-extraction";

describe("Extraction Submit", () => {
	let client: VCRKadoaClient;
	const env = getVCRTestEnv();

	beforeAll(() => {
		requireVCRCache(CACHE_DIR);

		client = createVCRClient(
			{
				apiKey: env.KADOA_API_KEY,
				baseUrl: env.KADOA_PUBLIC_API_URI,
				timeout: 30000,
			},
			{
				cacheDir: CACHE_DIR,
				sanitize: true,
				debug: env.VCR_DEBUG === "true",
			},
		);

		console.log(`[VCR] Running in ${client.getVCR().getMode()} mode`);
	});

	afterAll(() => {
		if (client) {
			client.dispose();

			const stats = VCRUtils.getCacheStats(CACHE_DIR);
			console.log(`[VCR] Cache stats:`, stats);
		}
	});

	test(
		"submits workflow and queries status",
		async () => {
			// Submit extraction workflow
			const submitResult = await client.extraction.submit({
				urls: ["https://example.com/products"],
				name: "Test Submit Extraction",
			});

			expect(submitResult).toBeDefined();
			expect(submitResult.workflowId).toBeDefined();
			expect(typeof submitResult.workflowId).toBe("string");

			console.log(`[Test] Submitted workflow: ${submitResult.workflowId}`);

			// Query workflow status once
			const status = await client.workflow.get(submitResult.workflowId);

			expect(status).toBeDefined();
			expect(status._id).toBe(submitResult.workflowId);
			expect(status.state).toBeDefined();

			console.log(
				`[Test] Workflow status - State: ${status.state}, RunState: ${status.runState}`,
			);
		},
		{ timeout: 60000 },
	);
});
