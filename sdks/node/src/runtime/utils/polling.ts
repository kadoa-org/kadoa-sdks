import { KadoaSdkException } from "../exceptions";

/**
 * Options for polling operations
 */
export interface PollingOptions {
  /**
   * Polling interval in milliseconds (minimum 10000ms)
   * @default 10000
   */
  pollIntervalMs?: number;
  /**
   * Timeout in milliseconds
   * @default 300000 (5 minutes)
   */
  timeoutMs?: number;
  /**
   * AbortSignal to cancel the polling operation
   */
  abortSignal?: AbortSignal;
}

/**
 * Internal polling options with all required fields
 */
export interface PollingOptionsInternal
  extends Required<Omit<PollingOptions, "abortSignal">> {
  abortSignal?: AbortSignal;
}

/**
 * Default polling options
 */
export const DEFAULT_POLLING_OPTIONS: PollingOptionsInternal = {
  pollIntervalMs: 10_000,
  timeoutMs: 5 * 60 * 1000,
};

/**
 * Result of a polling operation
 */
export interface PollingResult<T> {
  /**
   * The final result when polling completes successfully
   */
  result: T;
  /**
   * The number of polling attempts made
   */
  attempts: number;
  /**
   * The total time spent polling in milliseconds
   */
  duration: number;
}

/**
 * Polling error codes
 */
export const POLLING_ERROR_CODES = {
  ABORTED: "ABORTED",
  TIMEOUT: "TIMEOUT",
} as const;

/**
 * Generic polling utility that polls a function until a condition is met
 *
 * @param pollFn Function to call on each poll attempt
 * @param isComplete Function to check if polling should complete
 * @param options Polling configuration options
 * @returns Promise that resolves with the polling result
 *
 * @example
 * ```typescript
 * const result = await pollUntil(
 *   () => api.getStatus(id),
 *   (status) => status.completedAt !== null,
 *   { pollIntervalMs: 2000, timeoutMs: 60000 }
 * );
 * ```
 */
export async function pollUntil<T>(
  pollFn: () => Promise<T>,
  isComplete: (result: T) => boolean,
  options: PollingOptions = {},
): Promise<PollingResult<T>> {
  const internalOptions: PollingOptionsInternal = {
    ...DEFAULT_POLLING_OPTIONS,
    ...options,
  };

  const pollInterval = Math.max(10_000, internalOptions.pollIntervalMs);
  const timeoutMs = internalOptions.timeoutMs;
  const start = Date.now();
  let attempts = 0;

  while (Date.now() - start < timeoutMs) {
    if (internalOptions.abortSignal?.aborted) {
      throw new KadoaSdkException("Polling operation was aborted", {
        code: POLLING_ERROR_CODES.ABORTED,
      });
    }

    attempts++;
    const current = await pollFn();

    if (isComplete(current)) {
      return {
        result: current,
        attempts,
        duration: Date.now() - start,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new KadoaSdkException(
    `Polling operation timed out after ${timeoutMs}ms`,
    {
      code: POLLING_ERROR_CODES.TIMEOUT,
      details: {
        timeoutMs,
        attempts,
        duration: Date.now() - start,
      },
    },
  );
}
