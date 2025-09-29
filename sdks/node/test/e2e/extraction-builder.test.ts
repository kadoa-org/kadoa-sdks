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
		"create workflow with notifications setup",
		async () => {
			const createdExtraction = await client
				.extract({
					urls: ["https://sandbox.kadoa.com/ecommerce"],
					name: "My Workflow",
				})
				.withNotifications({
					events: "all",
					channels: {
						WEBSOCKET: true,
					},
				})
				.bypassPreview()
				.setLocation({
					type: "auto",
				})
				.setInterval({
					interval: "ONLY_ONCE",
				})
				.create();

			expect(createdExtraction).toBeDefined();
			expect(createdExtraction?.workflowId).toBeDefined();

			const results = await Promise.all(
				[1, 2, 3].map(async (i) => {
					const result = await createdExtraction.run({
						limit: 5,
						variables: {
							runSeq: i,
						},
					});
					return result.fetchData({
						limit: 5,
					});
				}),
			);

			expect(results).toBeDefined();
			expect(results.length).toBe(3);
			expect(results[0].data.length).toBe(5);
			expect(results[1].data.length).toBe(5);
			expect(results[2].data.length).toBe(5);
		},
		{ timeout: 700000 },
	);
});
