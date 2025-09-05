import { beforeAll, describe, expect, test } from "bun:test";
import type { KadoaSDK } from "../../src";
import { dispose, initializeSdk, runExtraction } from "../../src";

describe("runExtraction E2E Tests", () => {
	let sdkInstance: KadoaSDK;
	const TEST_API_KEY =
		process.env.KADOA_API_KEY || "39113751-1e7a-4cb2-9516-1e25d0085aa5";
	const TEST_BASE_URL = process.env.KADOA_BASE_URL || "http://localhost:12380";

	beforeAll(() => {
		dispose(sdkInstance);
		sdkInstance = initializeSdk({
			apiKey: TEST_API_KEY,
			baseUrl: TEST_BASE_URL,
			timeout: 30000,
		});
		sdkInstance.onEvent((event) => {
			console.log(event);
			console.log("--------------------------------");
		});
	});

	describe("Integration Tests", () => {
		test(
			"should run real extraction against a test website",
			async () => {
				const result = await runExtraction(sdkInstance, {
					urls: ["https://sandbox.kadoa.com/careers"],
				});

				expect(result).toBeDefined();
				expect(result?.workflowId).toBeDefined();
				expect(result?.data?.length).toBeGreaterThan(0);
			},
			{ timeout: 7000000 },
		);
	});
});
