import assert from "node:assert";
import { KadoaClient } from "@kadoa/node-sdk";

async function main() {
  const apiKey = process.env.KADOA_API_KEY;
  assert(apiKey, "KADOA_API_KEY is not set");

  const client = new KadoaClient({
    apiKey,
    enableRealtime: true,
  });
  client.realtime?.onEvent((event) => {
    console.log("event: ", event);
  });

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

  console.log(results);
}

main().catch(console.error);
