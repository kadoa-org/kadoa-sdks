import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient } from "../../src";
import { getE2ETestEnv } from "../utils/env";

describe("Extraction", () => {
	let client: KadoaClient;
	const env = getE2ETestEnv();

	beforeAll(() => {
		client = new KadoaClient({
			apiKey: env.KADOA_TEAM_API_KEY,
			timeout: 30000,
			enableRealtime: true,
		});

		client.realtime?.onEvent((event) => {
			console.log("event: ", event);
		});
	});

	afterAll(() => {
		client.dispose();
	});

	test(
		"extracts data from valid URL with minimal config (default preview mode)",
		async () => {
			const result = await client.extraction.run({
				urls: ["https://sandbox.kadoa.com/careers"],
				name: "test-extraction-with-minimal-config",
			});

			expect(result).toBeDefined();
			expect(result?.workflowId).toBeDefined();
			expect(result?.data?.length).toBeGreaterThan(0);
		},
		{ timeout: 700000 },
	);

	test(
		"extracts data from valid URL with notifications setup",
		async () => {
			const result = await client.extraction.run({
				urls: ["https://sandbox.kadoa.com/ecommerce"],
				name: "test-extraction-with-notifications",
				navigationMode: "paginated-page",
				notifications: {
					events: "all",
					channels: {
						WEBSOCKET: true,
					},
				},
			});

			expect(result).toBeDefined();
			expect(result?.workflowId).toBeDefined();
			expect(result?.data?.length).toBeGreaterThan(0);
		},
		{ timeout: 700000 },
	);

	test(
		"extracts data, waits for approval and then finishes",
		async () => {
			const result = await client.extraction.run({
				urls: ["https://sandbox.kadoa.com/careers"],
				name: "test-extraction-bypass-preview-true",
				bypassPreview: false,

				notifications: {
					events: "all",
					channels: {
						WEBSOCKET: true,
					},
				},
			});
			expect(result).toBeDefined();
			expect(result?.workflowId).toBeDefined();
			expect(result?.data?.length).toBeGreaterThan(0);
			expect(result?.workflow?.state).toBe("PREVIEW");

			await client.workflow.approve(result?.workflowId);
			const finished = await client.workflow.wait(result?.workflowId);
			expect(finished?.runState).toBe("FINISHED");
		},
		{ timeout: 700000 },
	);
});
