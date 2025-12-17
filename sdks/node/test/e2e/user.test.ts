import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { KadoaClient } from "../../src/kadoa-client";
import { KadoaHttpException } from "../../src/runtime/exceptions";
import { getTestEnv } from "../utils/env";

describe("User Module", () => {
  let client: KadoaClient;
  let invalidClient: KadoaClient;

  beforeAll(() => {
    const env = getTestEnv();
    client = new KadoaClient({ apiKey: env.KADOA_API_KEY });
    invalidClient = new KadoaClient({ apiKey: "invalid-api-key" });
  });

  afterAll(() => {
    client?.dispose();
    invalidClient?.dispose();
  });

  it("should get current user for valid api key", async () => {
    const result = await client.user.getCurrentUser();
    expect(result).toBeDefined();
    expect(result.userId).toBeDefined();
    expect(result.email).toBeDefined();
    expect(result.featureFlags).toBeDefined();
  });

  it("should throw error for invalid api key", async () => {
    expect(invalidClient.user.getCurrentUser()).rejects.toThrow(
      KadoaHttpException,
    );
  });
});
