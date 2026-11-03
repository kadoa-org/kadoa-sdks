import { describe, expect, mock, test } from "bun:test";
import type { InternalAxiosRequestConfig } from "axios";
import { KadoaClient } from "../../src/client/kadoa-client";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function captureRequestIds(client: KadoaClient): Array<unknown> {
  const seen: Array<unknown> = [];
  client.axiosInstance.defaults.adapter = async (
    config: InternalAxiosRequestConfig,
  ) => {
    seen.push(config.headers["x-request-id"]);
    return { data: {}, status: 200, statusText: "OK", headers: {}, config };
  };
  return seen;
}

describe("x-request-id", () => {
  test("generates a request id when the caller sets none", async () => {
    const client = new KadoaClient({ bearerToken: "jwt-test" });
    const seen = captureRequestIds(client);
    await client.axiosInstance.get("https://api.kadoa.com/v4/workflows");
    expect(seen[0]).toMatch(UUID);
  });

  test("keeps a request id set by a caller interceptor", async () => {
    const client = new KadoaClient({ bearerToken: "jwt-test" });
    client.axiosInstance.interceptors.request.use((config) => {
      config.headers["x-request-id"] = "caller-request-id";
      return config;
    });
    const seen = captureRequestIds(client);
    await client.axiosInstance.get("https://api.kadoa.com/v4/workflows");
    expect(seen).toEqual(["caller-request-id"]);
  });
});
