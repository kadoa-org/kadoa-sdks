import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { KadoaClient } from "../../src/kadoa-client";
import { getTestEnv } from "../utils/env";

describe("KadoaClient", () => {
  let client: KadoaClient;
  let baseUrl: string;

  beforeAll(() => {
    const env = getTestEnv();
    baseUrl = env.KADOA_PUBLIC_API_URI;
    client = new KadoaClient({ apiKey: env.KADOA_API_KEY });
  });

  afterAll(() => {
    client?.dispose();
  });

  it("should get the status of the client", async () => {
    const status = await client.status();
    expect(status).toBeDefined();
    expect(status.baseUrl).toBe(baseUrl);
    expect(status.user).toBeDefined();
    expect(status.user.userId).toBeDefined();
    expect(status.user.email).toBeDefined();
  });
});
