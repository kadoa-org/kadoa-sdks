import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient } from "../../src";

describe("Extraction", () => {
	let client: KadoaClient;
	const TEST_API_KEY =
		process.env.KADOA_API_KEY || "39113751-1e7a-4cb2-9516-1e25d0085aa5";
	const TEST_BASE_URL = process.env.KADOA_BASE_URL || "http://localhost:12380";

	beforeAll(() => {
		client = new KadoaClient({
			apiKey: TEST_API_KEY,
			baseUrl: TEST_BASE_URL,
			timeout: 30000,
		});
		client.onEvent((event) => {
			console.log(event);
			console.log("--------------------------------");
		});
	});

	afterAll(() => {
		client.dispose();
	});

	test(
		"extracts data from valid URL",
		async () => {
			const result = await client.extraction.run({
				urls: ["https://sandbox.kadoa.com/careers"],
			});

			expect(result).toBeDefined();
			expect(result?.workflowId).toBeDefined();
			expect(result?.data?.length).toBeGreaterThan(0);
		},
		{ timeout: 7000000 },
	);
});
