import { describe, expect, test } from "bun:test";
import { KadoaSdkException } from "../../src/runtime/exceptions";
import { validateAdditionalData } from "../../src/runtime/utils";

describe("Workflows - additionalData Validation", () => {
  describe("valid payloads", () => {
    test("accepts plain object", () => {
      expect(() =>
        validateAdditionalData({ foo: "bar", nested: { count: 1 } }),
      ).not.toThrow();
    });

    test("accepts undefined", () => {
      expect(() => validateAdditionalData(undefined)).not.toThrow();
    });

    test("warns but allows large payloads", () => {
      const originalWarn = console.warn;
      const warnings: Array<string> = [];
      console.warn = (...args: unknown[]) => {
        warnings.push(String(args[0]));
      };
      try {
        const largePayload = { data: "x".repeat(110 * 1024) };
        validateAdditionalData(largePayload);
        expect(warnings.length).toBe(1);
      } finally {
        console.warn = originalWarn;
      }
    });
  });

  describe("invalid payloads", () => {
    test("rejects null", () => {
      expect(() => validateAdditionalData(null)).toThrow(KadoaSdkException);
    });

    test("rejects arrays", () => {
      expect(() => validateAdditionalData(["foo"])).toThrow(KadoaSdkException);
    });

    test("rejects circular structures", () => {
      const circular: { self?: unknown } = {};
      circular.self = circular;
      expect(() => validateAdditionalData(circular)).toThrow(KadoaSdkException);
    });
  });
});
