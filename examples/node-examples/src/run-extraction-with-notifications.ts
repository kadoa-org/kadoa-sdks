import assert from "node:assert";
import { KadoaClient } from "@kadoa/node-sdk";
import { config } from "dotenv";

config({ path: ".env" });

async function main() {
  assert(process.env.KADOA_API_KEY, "KADOA_API_KEY is not set");
  assert(process.env.KADOA_PUBLIC_API_URI, "KADOA_PUBLIC_API_URI is not set");

  const client = new KadoaClient({
    apiKey: process.env.KADOA_API_KEY,
    enableRealtime: true,
  });

  client.realtime?.onEvent((event) => {
    console.log("event: ", event);
  });

  const availableEvents = await client.notification.settings.listAllEvents();
  console.log("availableEvents: ", availableEvents);

  const _result = await client.extraction.run({
    urls: ["https://sandbox.kadoa.com/ecommerce"],
    notifications: {
      events: "all", // or subset of availableEvents
      channels: {
        WEBSOCKET: true,
      },
    },
  });
}

main().catch(console.error);
