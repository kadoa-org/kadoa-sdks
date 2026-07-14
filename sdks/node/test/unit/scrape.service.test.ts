import { describe, expect, mock, test } from "bun:test";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { KadoaClient } from "../../src/client/kadoa-client";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

const scrapeResponse = {
  success: true,
  contentType: "text/markdown",
  content: "# Example",
  statusCode: 200,
  finalUrl: "https://example.com/",
  execution: { totalDurationMs: 12, attempts: [] },
};

async function captureScrape(
  client: KadoaClient,
  request: Parameters<KadoaClient["scrape"]["fetch"]>[0],
): Promise<{
  config: InternalAxiosRequestConfig;
  result: Awaited<ReturnType<KadoaClient["scrape"]["fetch"]>>;
}> {
  let captured: InternalAxiosRequestConfig | undefined;
  client.axiosInstance.defaults.adapter = async (config) => {
    captured = config;
    return {
      data: scrapeResponse,
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    } as AxiosResponse;
  };

  const result = await client.scrape.fetch(request);
  if (!captured) throw new Error("no request captured");
  return { config: captured, result };
}

describe("ScrapeService", () => {
  test("posts a scrape request and returns the response", async () => {
    const client = new KadoaClient({ bearerToken: "jwt-test" });
    const { config, result } = await captureScrape(client, {
      url: "https://example.com",
    });

    expect(config.method).toBe("post");
    expect(config.url).toBe("https://api.kadoa.com/v4/scrape");
    expect(JSON.parse(config.data)).toEqual({ url: "https://example.com" });
    expect(config.headers["Authorization"]).toBe("Bearer jwt-test");
    expect(config.headers["x-api-key"]).toBeUndefined();
    expect(result).toEqual(scrapeResponse);
  });

  test("passes public routing and format options unchanged", async () => {
    const client = new KadoaClient({ apiKey: "tk-test" });
    const { config } = await captureScrape(client, {
      url: "https://example.com",
      format: "html",
      fetchMode: "browser",
      proxy: "stealth",
    });

    expect(JSON.parse(config.data)).toEqual({
      url: "https://example.com",
      format: "html",
      fetchMode: "browser",
      proxy: "stealth",
    });
    expect(config.headers["x-api-key"]).toBe("tk-test");
    expect(config.headers["Authorization"]).toBeUndefined();
  });
});
