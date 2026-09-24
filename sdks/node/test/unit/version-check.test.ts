import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { KadoaClient } from "../../src/client/kadoa-client";

// Other unit tests stub this module via mock.module, and Bun shares module
// mocks across every test file in the run. Load the real implementation under
// a distinct specifier and re-bind it so KadoaClient calls the real check.
const realVersionCheck = await import(
  "../../src/runtime/utils/version-check.ts?real"
);
mock.module("../../src/runtime/utils/version-check", () => ({
  ...realVersionCheck,
}));
const { checkForUpdates, resetVersionCheckForTesting } = realVersionCheck;

const NPM_REGISTRY_PACKAGE_URL = "https://registry.npmjs.org/@kadoa/node-sdk";

describe("version check", () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof mock>;

  const registryCalls = () =>
    fetchMock.mock.calls.filter(
      ([input]) => String(input) === NPM_REGISTRY_PACKAGE_URL,
    );

  beforeEach(() => {
    resetVersionCheckForTesting();
    fetchMock = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ "dist-tags": { latest: "0.0.0" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetVersionCheckForTesting();
  });

  test("does not fetch the registry when checkForUpdates is false", () => {
    new KadoaClient({ apiKey: "tk-test", checkForUpdates: false });
    new KadoaClient({ apiKey: "tk-test", checkForUpdates: false });

    expect(registryCalls()).toHaveLength(0);
  });

  test("fetches the registry at most once across multiple constructions", () => {
    new KadoaClient({ apiKey: "tk-test" });
    new KadoaClient({ apiKey: "tk-test" });

    expect(registryCalls()).toHaveLength(1);
  });

  test("checkForUpdates runs once per process until reset", async () => {
    await checkForUpdates();
    await checkForUpdates();
    expect(registryCalls()).toHaveLength(1);

    resetVersionCheckForTesting();
    await checkForUpdates();
    expect(registryCalls()).toHaveLength(2);
  });
});
