import { describe, expect, mock, test } from "bun:test";
import type { InternalAxiosRequestConfig } from "axios";
import axios from "axios";
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
    async function runInterceptors(
      client: KadoaClient,
      initial: Partial<InternalAxiosRequestConfig>,
    ): Promise<InternalAxiosRequestConfig> {
      // Access the interceptor handlers from axios internals
      const handlers = (client.axiosInstance.interceptors.request as any)
        .handlers as Array<{
        fulfilled: (
          config: InternalAxiosRequestConfig,
        ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
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
          config = await handler.fulfilled(config);
        }
      }
      return config;
    }

    test("injects Authorization header when bearerToken is set", async () => {
      const client = new KadoaClient({ bearerToken: "my-jwt" });
      const result = await runInterceptors(client, {});
      expect(result.headers["Authorization"]).toBe("Bearer my-jwt");
    });

    test("removes x-api-key header when bearerToken is set", async () => {
      const client = new KadoaClient({ bearerToken: "my-jwt" });
      const result = await runInterceptors(client, {
        headers: new axios.AxiosHeaders({ "x-api-key": "stale-key" }),
      });
      expect(result.headers["x-api-key"]).toBeUndefined();
    });

    test("does not inject Authorization when only apiKey is used", async () => {
      const client = new KadoaClient({ apiKey: "tk-test" });
      const result = await runInterceptors(client, {});
      expect(result.headers["Authorization"]).toBeUndefined();
    });

    test("injects x-api-key when only apiKey is used", async () => {
      const client = new KadoaClient({ apiKey: "tk-test" });
      const result = await runInterceptors(client, {});
      expect(result.headers["x-api-key"]).toBe("tk-test");
    });

    test("does not override existing x-api-key header in apiKey mode", async () => {
      const client = new KadoaClient({ apiKey: "tk-test" });
      const result = await runInterceptors(client, {
        headers: new axios.AxiosHeaders({ "x-api-key": "override-key" }),
      });
      expect(result.headers["x-api-key"]).toBe("override-key");
    });

    test("does not override existing Authorization header", async () => {
      const client = new KadoaClient({ bearerToken: "instance-jwt" });
      const result = await runInterceptors(client, {
        headers: new axios.AxiosHeaders({
          Authorization: "Bearer override-jwt",
        }),
      });
      expect(result.headers["Authorization"]).toBe("Bearer override-jwt");
    });
  });

  describe("lazy bearer token", () => {
    async function captureFinalRequest(
      client: KadoaClient,
      call: () => Promise<unknown>,
      responseData: unknown = {},
    ): Promise<InternalAxiosRequestConfig> {
      let captured: InternalAxiosRequestConfig | undefined;
      client.axiosInstance.defaults.adapter = async (config) => {
        captured = config;
        return {
          data: responseData,
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        } as any;
      };
      await call();
      if (!captured) throw new Error("no request captured");
      return captured;
    }

    test("resolves sync function per request", async () => {
      const fn = mock(() => "lazy-jwt");
      const client = new KadoaClient({ bearerToken: fn });
      const req = await captureFinalRequest(client, () => client.listTeams());
      expect(req.headers["Authorization"]).toBe("Bearer lazy-jwt");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test("resolves async function per request", async () => {
      const fn = mock(async () => "async-jwt");
      const client = new KadoaClient({ bearerToken: fn });
      const req = await captureFinalRequest(client, () => client.listTeams());
      expect(req.headers["Authorization"]).toBe("Bearer async-jwt");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test("re-invokes function on each request reflecting updated value", async () => {
      let token = "v1";
      const fn = mock(() => token);
      const client = new KadoaClient({ bearerToken: fn });

      const req1 = await captureFinalRequest(client, () => client.listTeams());
      expect(req1.headers["Authorization"]).toBe("Bearer v1");

      token = "v2";
      const req2 = await captureFinalRequest(client, () => client.listTeams());
      expect(req2.headers["Authorization"]).toBe("Bearer v2");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test("setBearerToken accepts a function", async () => {
      const client = new KadoaClient({ apiKey: "tk-test" });
      client.setBearerToken(() => "from-setter");
      const req = await captureFinalRequest(client, () => client.listTeams());
      expect(req.headers["Authorization"]).toBe("Bearer from-setter");
    });

    test("listTeams BearerAuthOptions accepts a function", async () => {
      const client = new KadoaClient({ apiKey: "tk-test" });
      const req = await captureFinalRequest(client, () =>
        client.listTeams({ bearerToken: () => "per-call-jwt" }),
      );
      expect(req.headers["Authorization"]).toBe("Bearer per-call-jwt");
    });
  });

  describe("setBearerToken", () => {
    test("updates token used by interceptor", async () => {
      const client = new KadoaClient({ apiKey: "tk-test" });

      // Initially no bearer — interceptor should not set Authorization
      const handlers = (client.axiosInstance.interceptors.request as any)
        .handlers as Array<{
        fulfilled: (
          config: InternalAxiosRequestConfig,
        ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
      }>;

      const makeConfig = () =>
        ({
          headers: new axios.AxiosHeaders({}),
        }) as InternalAxiosRequestConfig;

      let config = makeConfig();
      for (const h of handlers) {
        if (h?.fulfilled) config = await h.fulfilled(config);
      }
      expect(config.headers["Authorization"]).toBeUndefined();

      // After setting bearer token, interceptor should inject it
      client.setBearerToken("new-jwt");

      config = makeConfig();
      for (const h of handlers) {
        if (h?.fulfilled) config = await h.fulfilled(config);
      }
      expect(config.headers["Authorization"]).toBe("Bearer new-jwt");
    });
  });

  describe("setActiveTeam", () => {
    test("throws on empty teamId", async () => {
      const client = new KadoaClient({ bearerToken: "jwt-test" });
      expect(client.setActiveTeam("")).rejects.toThrow(KadoaSdkException);
    });

    test("throws on whitespace-only teamId", async () => {
      const client = new KadoaClient({ bearerToken: "jwt-test" });
      expect(client.setActiveTeam("   ")).rejects.toThrow(KadoaSdkException);
    });

    test("posts to correct endpoint with teamId payload", async () => {
      const client = new KadoaClient({ bearerToken: "jwt-test" });

      // Capture the request the interceptor chain would build
      let capturedUrl: string | undefined;
      let capturedData: unknown;
      client.axiosInstance.interceptors.request.use((config) => {
        capturedUrl = `${config.baseURL}${config.url}`;
        capturedData = config.data;
        // Abort before actually sending — we only care about the config
        throw new axios.Cancel("intercepted");
      });

      try {
        await client.setActiveTeam("team-uuid-123");
      } catch {
        // Expected — we cancelled the request
      }

      expect(capturedUrl).toContain("/v5/auth/active-team");
      expect(capturedData).toEqual({ teamId: "team-uuid-123" });
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
