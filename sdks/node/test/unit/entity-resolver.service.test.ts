import { describe, expect, mock, test } from "bun:test";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { KadoaClient } from "../../src/client/kadoa-client";
import { EntityResolverService } from "../../src/domains/extraction/services/entity-resolver.service";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

async function captureRequest(
  client: KadoaClient,
  call: () => Promise<unknown>,
): Promise<InternalAxiosRequestConfig> {
  let captured: InternalAxiosRequestConfig | undefined;
  client.axiosInstance.defaults.adapter = async (config) => {
    captured = config;
    return {
      data: {
        success: true,
        entityPrediction: [{ entity: "Product", fields: [] }],
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    } as AxiosResponse;
  };
  await call();
  if (!captured) throw new Error("no request captured");
  return captured;
}

describe("EntityResolverService.fetchEntityFields auth headers", () => {
  test("bearer-only mode emits Authorization and no x-api-key", async () => {
    const client = new KadoaClient({ bearerToken: "jwt-test" });
    const resolver = new EntityResolverService(client);
    const req = await captureRequest(client, () =>
      resolver.fetchEntityFields({ link: "https://example.com" }),
    );
    expect(req.headers["Authorization"]).toBe("Bearer jwt-test");
    expect(req.headers["x-api-key"]).toBeUndefined();
  });

  test("apiKey mode emits x-api-key and no Authorization", async () => {
    const client = new KadoaClient({ apiKey: "tk-test" });
    const resolver = new EntityResolverService(client);
    const req = await captureRequest(client, () =>
      resolver.fetchEntityFields({ link: "https://example.com" }),
    );
    expect(req.headers["x-api-key"]).toBe("tk-test");
    expect(req.headers["Authorization"]).toBeUndefined();
  });
});
