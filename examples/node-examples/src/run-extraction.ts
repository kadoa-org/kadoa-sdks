import assert from "node:assert";
import { initializeSdk, runExtraction } from "@kadoa/node-sdk";
import { config } from "dotenv";

config({ path: ".env" });

async function main() {
	assert(process.env.KADOA_API_KEY, "KADOA_API_KEY is not set");
	assert(process.env.KADOA_API_URL, "KADOA_API_URL is not set");

	const sdk = initializeSdk({
		apiKey: process.env.KADOA_API_KEY,
		baseUrl: process.env.KADOA_API_URL,
	});
	sdk.onEvent((event) => {
		console.log(event);
		console.log("--------------------------------");
	});

	const result = await runExtraction(sdk, {
		urls: ["https://sandbox.kadoa.com/ecommerce"],
	});
	console.log(result);
}

main().catch(console.error);
