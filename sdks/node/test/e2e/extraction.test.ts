import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient } from "../../src";
import { getE2ETestEnv } from "../utils/env";

describe("Extraction", () => {
	let client: KadoaClient;
	const env = getE2ETestEnv();

	beforeAll(() => {
		client = new KadoaClient({
			apiKey: env.TEST_USER_API_KEY,
			baseUrl: env.KADOA_BASE_URL,
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
