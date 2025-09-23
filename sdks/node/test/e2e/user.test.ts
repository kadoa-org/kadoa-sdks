import { beforeAll, describe, expect, it } from "bun:test";
import { KadoaHttpException } from "../../src/internal/runtime/exceptions";
import { KadoaClient } from "../../src/kadoa-client";
import { getTestEnv } from "../utils/env";

describe("User Module", () => {
	let env: ReturnType<typeof getTestEnv>;

	beforeAll(() => {
		env = getTestEnv();
	});

	it("should get current user for valid api key", async () => {
		const client = new KadoaClient({ apiKey: env.KADOA_API_KEY });
		const result = await client.user.getCurrentUser();
		expect(result).toBeDefined();
		expect(result.userId).toBeDefined();
		expect(result.email).toBeDefined();
		expect(result.featureFlags).toBeDefined();
	});

	it("should throw error for invalid api key", async () => {
		const client = new KadoaClient({ apiKey: "invalid-api-key" });
		expect(client.user.getCurrentUser()).rejects.toThrow(KadoaHttpException);
	});
});
