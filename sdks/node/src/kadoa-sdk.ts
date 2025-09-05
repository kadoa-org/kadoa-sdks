import type { AxiosInstance } from "axios";
import axios from "axios";
import {
	type AnyKadoaEvent,
	KadoaEventEmitter,
	type KadoaEventName,
} from "./events";
import type { EventPayloadMap } from "./events/event-types";
import { Configuration, type ConfigurationParameters } from "./generated";

export interface KadoaSDK {
	configuration: Configuration;
	axiosInstance: AxiosInstance;
	baseUrl: string;
	events: KadoaEventEmitter;
	emit: <T extends KadoaEventName>(
		eventName: T,
		payload: EventPayloadMap[T],
		source?: string,
		metadata?: Record<string, unknown>,
	) => void;
	onEvent: (listener: (event: AnyKadoaEvent) => void) => void;
	offEvent: (listener: (event: AnyKadoaEvent) => void) => void;
}

export interface KadoaConfig {
	apiKey: string;
	baseUrl?: string;
	timeout?: number;
}

/**
 * Initialize a Kadoa SDK instance
 * @param config Configuration options for the Kadoa SDK
 * @returns Initialized KadoaSDK instance
 *
 * @example
 * ```typescript
 * import { initializeApp } from '@kadoa/sdk';
 *
 * const sdkInstance = initializeApp({
 *   apiKey: 'your-api-key'
 * });
 * ```
 */
export function initializeSdk(config: KadoaConfig): KadoaSDK {
	const baseUrl = config.baseUrl || "https://api.kadoa.com";

	const configParams: ConfigurationParameters = {
		apiKey: config.apiKey,
		basePath: baseUrl,
	};

	const configuration = new Configuration(configParams);

	const axiosInstance = axios.create({
		timeout: config.timeout || 30000,
	});

	// Always create event emitter (minimal overhead when unused)
	const events = new KadoaEventEmitter();

	return {
		configuration,
		axiosInstance,
		baseUrl,
		events,
		emit: <T extends KadoaEventName>(
			eventName: T,
			payload: EventPayloadMap[T],
			source?: string,
			metadata?: Record<string, unknown>,
		) => {
			events.emit(eventName, payload, source, metadata);
		},
		onEvent: (listener: (event: AnyKadoaEvent) => void) => {
			events.onEvent(listener);
		},
		offEvent: (listener: (event: AnyKadoaEvent) => void) => {
			events.offEvent(listener);
		},
	};
}

/**
 * Dispose of a KadoaApp instance and clean up resources
 * @param sdkInstance The KadoaApp instance to dispose
 *
 * @example
 * ```typescript
 * const sdkInstance = initializeSdk({ apiKey, enableEvents: true });
 * // ... use the app
 * dispose(sdkInstance); // Clean up when done
 * ```
 */
export function dispose(sdkInstance: KadoaSDK): void {
	if (sdkInstance?.events) {
		sdkInstance.events.removeAllListeners();
	}

	// Note: API clients use WeakMap caching and will be automatically
	// garbage collected when the sdkInstance instance is no longer referenced.
	// The axios instance itself doesn't require explicit cleanup as it
	// doesn't maintain persistent connections or resources.

	// Future cleanup that could be added if needed:
	// - Cancel pending axios requests using AbortController
	// - Clear any custom axios interceptors
	// - Clear any timers or intervals
	// - Close WebSocket connections
}
