import { beforeAll, describe, expect, it } from "bun:test";
import { KadoaClient } from "../../src/kadoa-client";
import { getTestEnv } from "../utils/env";

describe("User Module", () => {
  let env: ReturnType<typeof getTestEnv>;
  let client: KadoaClient;

  beforeAll(() => {
    env = getTestEnv();
    client = new KadoaClient({ apiKey: env.KADOA_API_KEY });
  });

  it("should get the status of the client", async () => {
    const status = await client.status();
    expect(status).toBeDefined();
    expect(status.baseUrl).toBe(env.KADOA_PUBLIC_API_URI);
    expect(status.user).toBeDefined();
    expect(status.user.userId).toBeDefined();
    expect(status.user.email).toBeDefined();
  });
});
