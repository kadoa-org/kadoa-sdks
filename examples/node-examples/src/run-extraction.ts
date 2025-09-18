import assert from "node:assert";
import { KadoaClient } from "@kadoa/node-sdk";
import { config } from "dotenv";

config({ path: ".env" });

async function main() {
	assert(process.env.KADOA_API_KEY, "KADOA_API_KEY is not set");
	assert(process.env.KADOA_PUBLIC_API_URI, "KADOA_PUBLIC_API_URI is not set");

	const client = new KadoaClient({
		apiKey: process.env.KADOA_API_KEY,
	});

	const result = await client.extraction.run({
		urls: ["https://sandbox.kadoa.com/ecommerce"],
	});

	if (result.workflowId) {
		const page1 = await client.extraction.fetchData({
			workflowId: result.workflowId,
			page: 1,
		});
		console.log("Page 2:");
		console.log("--------------------------------");
		console.log(page1.data?.slice(0, 5));
		console.log(page1.pagination);
		console.log("--------------------------------");
	}

	console.log(result.data?.slice(0, 5));
}

main().catch(console.error);
