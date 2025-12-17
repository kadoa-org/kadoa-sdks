/**
 * TS-WEBSOCKETS: data-delivery/websockets.mdx snippets
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { KadoaClient } from "../../../src/kadoa-client";
import { getTestEnv } from "../../utils/env";

describe("TS-WEBSOCKETS: data-delivery/websockets.mdx snippets", () => {
  let client: KadoaClient;
  const apiKey = getTestEnv().KADOA_API_KEY;

  beforeAll(() => {
    client = new KadoaClient({ apiKey });
  });

  afterAll(() => {
    client.dispose?.();
  });

  it("TS-WEBSOCKETS-001: WebSocket real-time updates", async () => {
    // @docs-start TS-WEBSOCKETS-001
    const client = new KadoaClient({ apiKey });
    const realtime = await client.connectRealtime();

    realtime.onEvent((event) => {
      console.log("Event:", event);
    });

    realtime.onConnection((connected) => {
      console.log("Connection status:", connected);
    });
    realtime.onError((error) => {
      console.error("Realtime connection error:", error);
    });
    // @docs-end TS-WEBSOCKETS-001

    expect(client.realtime).toBeDefined();
    expect(client.isRealtimeConnected()).toBeTruthy();
  });
});
