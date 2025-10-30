import { KadoaSdkException } from "../exceptions";

/**
 * Validate the additionalData payload accepted by workflow creation and update APIs.
 * Ensures the value is a plain JSON-serializable object and warns if large.
 */
export function validateAdditionalData(additionalData: unknown): void {
  if (additionalData === undefined) return;

  if (
    additionalData === null ||
    typeof additionalData !== "object" ||
    Array.isArray(additionalData)
  ) {
    throw new KadoaSdkException("additionalData must be a plain object", {
      code: "VALIDATION_ERROR",
    });
  }

  try {
    const serialized = JSON.stringify(additionalData);
    if (serialized.length > 100 * 1024) {
      console.warn(
        "[Kadoa SDK] additionalData exceeds 100KB, consider reducing size",
      );
    }
  } catch {
    throw new KadoaSdkException("additionalData must be JSON-serializable", {
      code: "VALIDATION_ERROR",
    });
  }
}
