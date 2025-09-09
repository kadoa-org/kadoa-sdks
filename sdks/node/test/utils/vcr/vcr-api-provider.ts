import type { KadoaClientConfig } from "../../../src";
import { KadoaClient } from "../../../src";
import { AxiosVCR, type VCROptions } from "./axios-vcr";
/**
 * Extended KadoaClient with VCR capabilities for testing
 * This allows recording and replaying API responses
 */
export class VCRKadoaClient extends KadoaClient {
	private vcr: AxiosVCR;

	constructor(config: KadoaClientConfig, vcrOptions: VCROptions = {}) {
		super(config);

		// Initialize VCR with the client's axios instance
		this.vcr = new AxiosVCR(this.axiosInstance, vcrOptions);
	}

	/**
	 * Get the VCR instance for direct control
	 */
	getVCR(): AxiosVCR {
		return this.vcr;
	}

	/**
	 * Override dispose to also clean up VCR
	 */
	dispose(): void {
		this.vcr.dispose();
		super.dispose();
	}
}

/**
 * Create a VCR-enabled client for testing
 *
 * @example
 * ```typescript
 * // Record mode: makes real API calls and saves responses
 * const client = createVCRClient({ apiKey: "test-key" }, { mode: "record" });
 *
 * // Replay mode: uses cached responses only
 * const client = createVCRClient({ apiKey: "test-key" }, { mode: "replay" });
 *
 * // Auto mode (default): uses cache if exists, records if not
 * const client = createVCRClient({ apiKey: "test-key" });
 * ```
 */
export function createVCRClient(
	config: KadoaClientConfig,
	vcrOptions: VCROptions = {},
): VCRKadoaClient {
	return new VCRKadoaClient(config, vcrOptions);
}
