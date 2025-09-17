import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { ExtractionService } from "../../src/modules/extraction/services/extraction.service";
import { getVCRTestEnv } from "../utils/env";
import {
	createVCRClient,
	requireVCRCache,
	type VCRKadoaClient,
	VCRUtils,
} from "../utils/vcr";

/**
 * Integration test using VCR for real API calls with caching
 *
 * Run modes:
 * - VCR_MODE=record - Makes real API calls and saves responses
 * - VCR_MODE=replay - Uses only cached responses (fails if cache missing)
 * - VCR_MODE=auto   - Uses cache if exists, records if not (default)
 *
 * @example
 * ```bash
 * # First run - record real API responses
 * VCR_MODE=record bun test test/integration/fetch-data-vcr.test.ts
 *
 * # Subsequent runs - use cached responses
 * VCR_MODE=replay bun test test/integration/fetch-data-vcr.test.ts
 *
 * # Auto mode - best for development
 * bun test test/integration/fetch-data-vcr.test.ts
 * ```
 */

const CACHE_DIR = "test/fixtures/vcr-cache/fetch-data";

describe("FetchDataQuery", () => {
	let client: VCRKadoaClient;
	let service: ExtractionService;
	const env = getVCRTestEnv();

	beforeAll(() => {
		requireVCRCache(CACHE_DIR);

		client = createVCRClient(
			{
				apiKey: env.TEST_USER_API_KEY,
				baseUrl: env.KADOA_BASE_URL,
				timeout: 30000,
			},
			{
				cacheDir: CACHE_DIR,
				sanitize: true,
				debug: env.VCR_DEBUG === "true",
			},
		);

		service = new ExtractionService(client);

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
		"fetches first page of workflow data",
		async () => {
			const result = await service.fetchData({
				workflowId: env.TEST_WORKFLOW_ID,
				page: 1,
				limit: 10,
			});

			expect(result).toBeDefined();
			expect(result.workflowId).toBe(env.TEST_WORKFLOW_ID);
			expect(result.data).toBeDefined();
			expect(Array.isArray(result.data)).toBe(true);
			expect(result.pagination).toBeDefined();

			if (result.pagination) {
				expect(result.pagination.page).toBe(1);
				expect(result.pagination.limit).toBe(10);
			}

			console.log(`[Test] Fetched ${result.data.length} items from page 1`);
		},
		{ timeout: 60000 },
	);

	test(
		"fetches multiple pages",
		async () => {
			const page1 = await service.fetchData({
				workflowId: env.TEST_WORKFLOW_ID,
				page: 1,
				limit: 5,
			});

			const page2 = await service.fetchData({
				workflowId: env.TEST_WORKFLOW_ID,
				page: 2,
				limit: 5,
			});

			expect(page1.pagination?.page).toBe(1);
			expect(page2.pagination?.page).toBe(2);

			if (page1.data.length > 0 && page2.data.length > 0) {
				expect(page1.data[0]).not.toEqual(page2.data[0]);
			}

			console.log(
				`[Test] Fetched page 1: ${page1.data.length} items, page 2: ${page2.data.length} items`,
			);
		},
		{ timeout: 60000 },
	);

	test(
		"handles different query parameters",
		async () => {
			const ascResult = await service.fetchData({
				workflowId: env.TEST_WORKFLOW_ID,
				page: 1,
				limit: 5,
				order: "asc",
			});

			const descResult = await service.fetchData({
				workflowId: env.TEST_WORKFLOW_ID,
				page: 1,
				limit: 5,
				order: "desc",
			});

			expect(ascResult).toBeDefined();
			expect(descResult).toBeDefined();

			console.log(
				`[Test] Tested different sort orders - ASC: ${ascResult.data.length} items, DESC: ${descResult.data.length} items`,
			);
		},
		{ timeout: 60000 },
	);
});

/**
 * Utility test for cache management.
 */
describe("VCR Cache Management", () => {
	test("validates cache integrity", async () => {
		const validation = await VCRUtils.validateAllRecordings(CACHE_DIR);
		console.log(`[VCR] Valid recordings: ${validation.valid}`);

		if (validation.invalid.length > 0) {
			console.warn(`[VCR] Invalid recordings found:`, validation.invalid);
		}

		expect(validation.invalid.length).toBe(0);
	});

	test("shows cache statistics", () => {
		const stats = VCRUtils.getCacheStats(CACHE_DIR);
		console.log("[VCR] Cache Statistics:");
		console.log(`  - Total recordings: ${stats.totalRecordings}`);
		console.log(`  - Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
		console.log(`  - Oldest: ${stats.oldestRecording?.toISOString() || "N/A"}`);
		console.log(`  - Newest: ${stats.newestRecording?.toISOString() || "N/A"}`);

		expect(stats.totalRecordings).toBeGreaterThanOrEqual(0);
	});
});
