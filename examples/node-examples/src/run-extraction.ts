import assert from "node:assert";
import { initializeSdk, runExtraction } from "@kadoa/sdk";
import { config } from "dotenv";

config({ path: ".env" });

async function main() {
	assert(process.env.KADOA_API_KEY, "KADOA_API_KEY is not set");
	assert(process.env.KADOA_API_URL, "KADOA_API_URL is not set");

	const app = initializeSdk({
		apiKey: process.env.KADOA_API_KEY,
		baseUrl: process.env.KADOA_API_URL,
	});

	const result = await runExtraction(app, {
		urls: ["https://sandbox.kadoa.com/ecommerce"],
	});
	console.log(result);
}

main().catch(console.error);
