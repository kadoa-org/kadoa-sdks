import { afterAll, describe, expect, it } from "bun:test";
import { KadoaClient } from "../../src/kadoa-client";
import { getTestEnv } from "../utils/env";

describe("Crawler Config E2E", () => {
  const env = getTestEnv();
  const client = new KadoaClient({ apiKey: env.KADOA_API_KEY });
  const createdConfigIds: string[] = [];

  afterAll(async () => {
    for (const configId of createdConfigIds) {
      try {
        await client.crawler.config.deleteConfig(configId);
      } catch {
        // ignore cleanup errors
      }
    }
  });

  it("should create a crawler config", async () => {
    const config = await client.crawler.config.createConfig({
      url: "https://sandbox.kadoa.com/careers",
      maxDepth: 2,
      maxPages: 10,
    });

    expect(config).toBeDefined();
    expect(config.configId).toBeDefined();
    expect(config.userId).toBeDefined();
    expect(config.createdAt).toBeDefined();

    createdConfigIds.push(config.configId);
  });

  it("should get a crawler config by ID", async () => {
    const created = await client.crawler.config.createConfig({
      url: "https://sandbox.kadoa.com/careers",
      maxDepth: 2,
    });
    createdConfigIds.push(created.configId);

    const retrieved = await client.crawler.config.getConfig(created.configId);

    expect(retrieved).toBeDefined();
    expect(retrieved.configId).toBe(created.configId);
  });

  it("should delete a crawler config", async () => {
    const created = await client.crawler.config.createConfig({
      url: "https://sandbox.kadoa.com/careers",
      maxDepth: 2,
    });

    const result = await client.crawler.config.deleteConfig(created.configId);

    expect(result).toBeDefined();
  });
});
