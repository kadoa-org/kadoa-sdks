import { describe, expect, test } from "bun:test";
import { KadoaClient } from "../src/kadoa-client";
import { SDK_LANGUAGE, SDK_NAME, SDK_VERSION } from "../src/version";

describe("SDK Headers", () => {
	test("should set SDK identification headers in configuration", () => {
		const client = new KadoaClient({
			apiKey: "test-api-key",
		});

		const baseOptions = client.configuration.baseOptions;
		expect(baseOptions).toBeDefined();
		expect(baseOptions.headers).toBeDefined();
		expect(baseOptions.headers["User-Agent"]).toBe(
			`${SDK_NAME}/${SDK_VERSION}`,
		);
		expect(baseOptions.headers["X-SDK-Version"]).toBe(SDK_VERSION);
		expect(baseOptions.headers["X-SDK-Language"]).toBe(SDK_LANGUAGE);
	});

	test("should set SDK identification headers in axios instance", () => {
		const client = new KadoaClient({
			apiKey: "test-api-key",
		});

		const axiosDefaults = client.axiosInstance.defaults;
		expect(axiosDefaults.headers).toBeDefined();
		expect(axiosDefaults.headers["User-Agent"]).toBe(
			`${SDK_NAME}/${SDK_VERSION}`,
		);
		expect(axiosDefaults.headers["X-SDK-Version"]).toBe(SDK_VERSION);
		expect(axiosDefaults.headers["X-SDK-Language"]).toBe(SDK_LANGUAGE);
	});

	test("should use correct SDK values", () => {
		expect(SDK_NAME).toBe("kadoa-node-sdk");
		expect(SDK_LANGUAGE).toBe("node");
		expect(SDK_VERSION).toMatch(/^\d+\.\d+\.\d+/); // Semantic version pattern
	});
});
