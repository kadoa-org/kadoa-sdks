/**
 * VCR (Video Cassette Recorder) Testing Utilities
 *
 * Record and replay HTTP responses for fast, deterministic testing
 */

export { AxiosVCR, type VCRMode, type VCROptions } from "./axios-vcr";
export { createVCRClient, VCRKadoaClient } from "./vcr-api-provider";
export {
  ensureVCRMode,
  requireVCRCache,
  skipIfNoCache,
  VCRUtils,
} from "./vcr-utils";
