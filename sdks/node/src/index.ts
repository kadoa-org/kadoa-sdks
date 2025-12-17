/**
 * @kadoa/node-sdk - Kadoa SDK for Node.js/TypeScript
 *
 * Public API surface
 */

// ============================================================================
// Domain Services & Types
// ============================================================================
export * from "./domains/extraction";
export * from "./domains/notifications";
export * from "./domains/realtime";
export * from "./domains/schemas";
export * from "./domains/user";
export * from "./domains/validation";
export * from "./domains/workflows";
// ============================================================================
// Core Client & Configuration
// ============================================================================
export {
  KadoaClient,
  type KadoaClientConfig,
  type KadoaClientStatus,
  type NotificationDomain,
  type TestNotificationRequest,
  type TestNotificationResult,
  type ValidationDomain,
} from "./kadoa-client";
// ============================================================================
// Error Handling
// ============================================================================
export {
  type KadoaErrorCode,
  KadoaHttpException,
  KadoaSdkException,
} from "./runtime/exceptions";
export { ERROR_MESSAGES } from "./runtime/exceptions/base.exception";
// ============================================================================
// Utilities (helpers for advanced use cases)
// ============================================================================
export { type PollingOptions, pollUntil } from "./runtime/utils";
