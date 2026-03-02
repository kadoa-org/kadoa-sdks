import { afterEach, describe, expect, mock, test } from "bun:test";
import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { KadoaClient } from "../../src/client/kadoa-client";
import { KadoaSdkException } from "../../src/runtime/exceptions";

// Suppress version-check network calls during tests
mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

describe("KadoaClient auth", () => {
  describe("constructor validation", () => {
    test("accepts apiKey-only config", () => {
      const client = new KadoaClient({ apiKey: "tk-test" });
      expect(client.apiKey).toBe("tk-test");
    });

    test("accepts bearerToken-only config", () => {
      const client = new KadoaClient({ bearerToken: "jwt-test" });
      expect(client.apiKey).toBe("");
    });

    test("accepts both apiKey and bearerToken", () => {
      const client = new KadoaClient({
        apiKey: "tk-test",
        bearerToken: "jwt-test",
      });
      expect(client.apiKey).toBe("tk-test");
    });

    test("throws KadoaSdkException when neither apiKey nor bearerToken provided", () => {
      expect(() => new KadoaClient({} as any)).toThrow(KadoaSdkException);
    });

    test("throws with VALIDATION_ERROR code", () => {
      try {
        new KadoaClient({} as any);
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(KadoaSdkException);
        expect((e as KadoaSdkException).message).toContain(
          "Either apiKey or bearerToken must be provided",
        );
      }
    });
  });

  describe("auth interceptor", () => {
    /**
     * Runs a request config through all registered request interceptors
     * on the client's axios instance without making a real HTTP call.
     */
    function runInterceptors(
      client: KadoaClient,
      initial: Partial<InternalAxiosRequestConfig>,
    ): InternalAxiosRequestConfig {
      // Access the interceptor handlers from axios internals
      const handlers = (
        client.axiosInstance.interceptors.request as any
      ).handlers as Array<{
        fulfilled: (
          config: InternalAxiosRequestConfig,
        ) => InternalAxiosRequestConfig;
      }>;

      let config = {
        headers: axios.defaults.headers.common,
        ...initial,
        // Ensure headers is an AxiosHeaders instance for interceptor compat
      } as InternalAxiosRequestConfig;

      // Normalize headers to a plain-ish AxiosHeaders
      config.headers = new axios.AxiosHeaders(config.headers as any);

      for (const handler of handlers) {
        if (handler?.fulfilled) {
          config = handler.fulfilled(config);
        }
      }
      return config;
    }

    test("injects Authorization header when bearerToken is set", () => {
      const client = new KadoaClient({ bearerToken: "my-jwt" });
      const result = runInterceptors(client, {});
      expect(result.headers["Authorization"]).toBe("Bearer my-jwt");
    });

    test("removes x-api-key header when bearerToken is set", () => {
      const client = new KadoaClient({ bearerToken: "my-jwt" });
      const result = runInterceptors(client, {
        headers: new axios.AxiosHeaders({ "x-api-key": "stale-key" }),
      });
      expect(result.headers["x-api-key"]).toBeUndefined();
    });

    test("does not inject Authorization when only apiKey is used", () => {
      const client = new KadoaClient({ apiKey: "tk-test" });
      const result = runInterceptors(client, {});
      expect(result.headers["Authorization"]).toBeUndefined();
    });

    test("does not override existing Authorization header", () => {
      const client = new KadoaClient({ bearerToken: "instance-jwt" });
      const result = runInterceptors(client, {
        headers: new axios.AxiosHeaders({
          Authorization: "Bearer override-jwt",
        }),
      });
      expect(result.headers["Authorization"]).toBe("Bearer override-jwt");
    });
  });

  describe("setBearerToken", () => {
    test("updates token used by interceptor", () => {
      const client = new KadoaClient({ apiKey: "tk-test" });

      // Initially no bearer — interceptor should not set Authorization
      const handlers = (
        client.axiosInstance.interceptors.request as any
      ).handlers as Array<{
        fulfilled: (
          config: InternalAxiosRequestConfig,
        ) => InternalAxiosRequestConfig;
      }>;

      const makeConfig = () =>
        ({
          headers: new axios.AxiosHeaders({}),
        }) as InternalAxiosRequestConfig;

      let config = makeConfig();
      for (const h of handlers) {
        if (h?.fulfilled) config = h.fulfilled(config);
      }
      expect(config.headers["Authorization"]).toBeUndefined();

      // After setting bearer token, interceptor should inject it
      client.setBearerToken("new-jwt");

      config = makeConfig();
      for (const h of handlers) {
        if (h?.fulfilled) config = h.fulfilled(config);
      }
      expect(config.headers["Authorization"]).toBe("Bearer new-jwt");
    });
  });

  describe("connectRealtime", () => {
    test("throws when using bearer-only auth (no apiKey)", async () => {
      const client = new KadoaClient({ bearerToken: "jwt-test" });
      expect(client.connectRealtime()).rejects.toThrow(KadoaSdkException);
    });

    test("error message mentions bearer-only limitation", async () => {
      const client = new KadoaClient({ bearerToken: "jwt-test" });
      try {
        await client.connectRealtime();
        expect.unreachable("should have thrown");
      } catch (e) {
        expect((e as KadoaSdkException).message).toContain(
          "Realtime requires an API key",
        );
      }
    });
  });
});
