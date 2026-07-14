import { describe, expect, mock, test } from "bun:test";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { KadoaClient } from "../../src/client/kadoa-client";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

/**
 * Capture the final request config (after all interceptors) by stubbing
 * the axios adapter to short-circuit the network call with a fake response.
 */
async function captureRequest(
  client: KadoaClient,
  call: () => Promise<unknown>,
  response: unknown = {
    userId: "u1",
    email: "u@example.com",
    featureFlags: [],
  },
): Promise<InternalAxiosRequestConfig> {
  let captured: InternalAxiosRequestConfig | undefined;
  client.axiosInstance.defaults.adapter = async (config) => {
    captured = config;
    return {
      data: response,
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

describe("UserService", () => {
  test("bearer-only mode emits Authorization and no x-api-key", async () => {
    const client = new KadoaClient({ bearerToken: "jwt-test" });
    const req = await captureRequest(client, () =>
      client.user.getCurrentUser(),
    );
    expect(req.headers["Authorization"]).toBe("Bearer jwt-test");
    expect(req.headers["x-api-key"]).toBeUndefined();
  });

  test("apiKey mode emits x-api-key and no Authorization", async () => {
    const client = new KadoaClient({ apiKey: "tk-test" });
    const req = await captureRequest(client, () =>
      client.user.getCurrentUser(),
    );
    expect(req.headers["x-api-key"]).toBe("tk-test");
    expect(req.headers["Authorization"]).toBeUndefined();
  });

  test("getFeatures requests team capabilities with bearer auth", async () => {
    const client = new KadoaClient({ bearerToken: "jwt-test" });
    const req = await captureRequest(client, () => client.user.getFeatures(), {
      features: { scrape: true },
    });

    expect(req.method).toBe("get");
    expect(req.url).toBe("https://api.kadoa.com/v4/me/features");
    expect(req.headers["Authorization"]).toBe("Bearer jwt-test");
    expect(req.headers["x-api-key"]).toBeUndefined();
  });

  test("getFeatures returns the typed capability response", async () => {
    const client = new KadoaClient({ apiKey: "tk-test" });
    let result: unknown;
    await captureRequest(
      client,
      async () => {
        result = await client.user.getFeatures();
      },
      { features: { scrape: false } },
    );

    expect(result).toEqual({ features: { scrape: false } });
  });

  test("getFeatures rejects malformed capability responses", async () => {
    const client = new KadoaClient({ apiKey: "tk-test" });
    expect(
      captureRequest(client, () => client.user.getFeatures(), { features: {} }),
    ).rejects.toThrow("Invalid capabilities data received");
  });
});
