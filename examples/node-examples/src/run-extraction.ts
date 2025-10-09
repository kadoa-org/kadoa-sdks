import assert from "node:assert";
import { KadoaClient } from "@kadoa/node-sdk";

async function main() {
  const apiKey = process.env.KADOA_API_KEY;
  assert(apiKey, "KADOA_API_KEY is not set");

  const client = new KadoaClient({
    apiKey,
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
