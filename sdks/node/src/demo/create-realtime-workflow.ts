#!/usr/bin/env bun
import assert from "node:assert";
import { KadoaClient } from "../kadoa-client";
import type { MonitoringConfig } from "../internal/domains/extraction/extraction.types";

const apiKey = process.env.KADOA_TEAM_API_KEY || process.env.KADOA_API_KEY;
assert(apiKey, "KADOA_TEAM_API_KEY is not set");

async function createRealtimeWorkflow() {
	const client = new KadoaClient({ apiKey: apiKey! });

	// Exact monitoring configuration from the web app
	const monitoring: MonitoringConfig = {
		enabled: true,
		fields: [
			{ fieldName: "title", operator: "changed" },
			{ fieldName: "date", operator: "changed" },
			{ fieldName: "link", operator: "changed" },
			{ fieldName: "description", operator: "changed" },
			{ fieldName: "title", operator: "added" },
			{ fieldName: "date", operator: "added" },
			{ fieldName: "link", operator: "added" },
			{ fieldName: "description", operator: "added" },
			{ fieldName: "title", operator: "removed" },
			{ fieldName: "date", operator: "removed" },
			{ fieldName: "link", operator: "removed" },
			{ fieldName: "description", operator: "removed" },
		],
		channels: [],
		conditions: undefined,
	};

	try {
		console.log("🚀 Creating realtime workflow...\n");

		// Submit the workflow with exact configuration
		const result = await client.extraction.submit({
			name: "sandbox.kadoa.com realtime from sdk",
			urls: ["https://sandbox.kadoa.com/change-detection"],
			location: { type: "auto" },
			interval: "REAL_TIME" as any,
			entity: "Item",
			fields: [
				{
					name: "title",
					description: "Title of the item",
					example: "Market Analysis Report",
					dataType: "STRING",
				},
				{
					name: "date",
					description: "Publication date of the item",
					example: "2024-01-15",
					dataType: "DATE",
				},
				{
					name: "link",
					description: "URL to the item details",
					example: "https://example.com/market-analysis-jan-2024",
					dataType: "LINK",
				},
				{
					name: "description",
					description: "Brief description of the item",
					example: "Comprehensive analysis of global commodity markets",
					dataType: "STRING",
				},
			],
			tags: [],
			monitoring,
		});

		console.log("✅ Realtime workflow created successfully!");
		console.log("📋 Workflow ID:", result.workflowId);
		console.log("\n📊 Workflow Details:");
		console.log("   Name: sandbox.kadoa.com realtime");
		console.log("   URL: https://sandbox.kadoa.com/change-detection");
		console.log("   Interval: REAL_TIME");
		console.log("   Entity: Item");
		console.log("   Fields: 4 (title, date, link, description)");
		console.log(
			"   Monitoring: Enabled (tracking changes, additions, removals)",
		);

		console.log("\n🔗 View in Kadoa Dashboard:");
		console.log(`   https://app.kadoa.com/workflows/${result.workflowId}`);

		console.log("\n📡 To listen for realtime events:");
		console.log("   1. Enable realtime in KadoaClient configuration");
		console.log("   2. Connect to WebSocket and subscribe to this workflow ID");
		console.log(
			`   3. Events will be streamed for workflow: ${result.workflowId}`,
		);

		return result.workflowId;
	} catch (error) {
		console.error("❌ Failed to create realtime workflow:", error);
		if (error instanceof Error && "response" in error) {
			const response = (error as any).response;
			console.error("📝 Error details:", response?.data || response);
		}
		process.exit(1);
	}
}

// Run if executed directly
if (require.main === module) {
	createRealtimeWorkflow()
		.then((workflowId) => {
			console.log("\n✨ Done! Workflow ID:", workflowId);
			process.exit(0);
		})
		.catch((error) => {
			console.error("Fatal error:", error);
			process.exit(1);
		});
}

export { createRealtimeWorkflow };
