import type { AxiosInstance } from "axios";
import axios from "axios";
import {
	Configuration,
	type ConfigurationParameters,
	CrawlApi,
	type CrawlApiInterface,
	WorkflowsApi,
	type WorkflowsApiInterface,
} from "./generated";
import {
	type AnyKadoaEvent,
	type EventPayloadMap,
	KadoaEventEmitter,
	type KadoaEventName,
} from "./internal/runtime/events";
import type { ApiProvider } from "./internal/runtime/http/api-provider";
import { ExtractionModule } from "./modules/extraction";
import { WorkflowsModule } from "./modules/workflows/workflows.module";
import { SDK_LANGUAGE, SDK_NAME, SDK_VERSION } from "./version";
import { randomUUID } from "node:crypto";

export interface KadoaClientConfig {
	apiKey: string;
	baseUrl?: string;
	timeout?: number;
	/**
	 * Optional API overrides for testing
	 */
	apiOverrides?: Partial<ApiProvider>;
}

/**
 * KadoaClient provides an object-oriented interface to the Kadoa SDK
 *
 * @example
 * ```typescript
 * import { KadoaClient } from '@kadoa/sdk';
 *
 * const client = new KadoaClient({
 *   apiKey: 'your-api-key'
 * });
 *
 * const result = await client.extraction.run({
 *   urls: ['https://example.com'],
 *   name: 'My Extraction'
 * });
 * ```
 */
export class KadoaClient implements ApiProvider {
	private readonly _configuration: Configuration;
	private readonly _axiosInstance: AxiosInstance;
	private readonly _baseUrl: string;
	private readonly _timeout: number;
	private readonly _events: KadoaEventEmitter;
	private readonly _workflowsApi: WorkflowsApiInterface;
	private readonly _crawlApi: CrawlApiInterface;

	public readonly extraction: ExtractionModule;
	public readonly workflow: WorkflowsModule;

	constructor(config: KadoaClientConfig) {
		this._baseUrl = config.baseUrl || "https://api.kadoa.com";
		this._timeout = config.timeout || 30000;

		const headers = {
			"User-Agent": `${SDK_NAME}/${SDK_VERSION}`,
			"X-SDK-Version": SDK_VERSION,
			"X-SDK-Language": SDK_LANGUAGE,
		};
		const configParams: ConfigurationParameters = {
			apiKey: config.apiKey,
			basePath: this._baseUrl,
			baseOptions: {
				headers,
			},
		};

		this._configuration = new Configuration(configParams);
		this._axiosInstance = axios.create({
			timeout: this._timeout,
			headers,
		});
		this._axiosInstance.interceptors.request.use((config) => {
			config.headers["x-request-id"] = randomUUID();
			return config;
		});
		this._events = new KadoaEventEmitter();

		this._workflowsApi =
			config.apiOverrides?.workflows ||
			new WorkflowsApi(this._configuration, this._baseUrl, this._axiosInstance);
		this._crawlApi =
			config.apiOverrides?.crawl ||
			new CrawlApi(this._configuration, this._baseUrl, this._axiosInstance);

		this.extraction = new ExtractionModule(this);
		this.workflow = new WorkflowsModule(this);
	}

	/**
	 * Register an event listener
	 *
	 * @param listener Function to handle events
	 */
	onEvent(listener: (event: AnyKadoaEvent) => void): void {
		this._events.onEvent(listener);
	}

	/**
	 * Remove an event listener
	 *
	 * @param listener Function to remove from event handlers
	 */
	offEvent(listener: (event: AnyKadoaEvent) => void): void {
		this._events.offEvent(listener);
	}

	/**
	 * Emit an event
	 * @internal
	 *
	 * @param eventName The name of the event
	 * @param payload The event payload
	 * @param source Optional source identifier
	 * @param metadata Optional metadata
	 */
	emit<T extends KadoaEventName>(
		eventName: T,
		payload: EventPayloadMap[T],
		source?: string,
		metadata?: Record<string, unknown>,
	): void {
		this._events.emit(eventName, payload, source, metadata);
	}

	/**
	 * Get the underlying configuration
	 *
	 * @returns The configuration object
	 */
	get configuration(): Configuration {
		return this._configuration;
	}

	/**
	 * Get the axios instance
	 *
	 * @returns The axios instance
	 */
	get axiosInstance(): AxiosInstance {
		return this._axiosInstance;
	}

	/**
	 * Get the base URL
	 *
	 * @returns The base URL
	 */
	get baseUrl(): string {
		return this._baseUrl;
	}

	/**
	 * Get the timeout value
	 *
	 * @returns The timeout in milliseconds
	 */
	get timeout(): number {
		return this._timeout;
	}

	/**
	 * Get the event emitter
	 * @internal
	 *
	 * @returns The event emitter
	 */
	get events(): KadoaEventEmitter {
		return this._events;
	}

	/**
	 * Get the workflows API
	 */
	get workflows(): WorkflowsApiInterface {
		return this._workflowsApi;
	}

	/**
	 * Get the crawl API
	 */
	get crawl(): CrawlApiInterface {
		return this._crawlApi;
	}

	/**
	 * Dispose of the client and clean up resources
	 */
	dispose(): void {
		this._events?.removeAllListeners();

		// Note: API clients use WeakMap caching and will be automatically
		// garbage collected when the client instance is no longer referenced.
		// The axios instance itself doesn't require explicit cleanup as it
		// doesn't maintain persistent connections or resources.

		// Future cleanup that could be added if needed:
		// - Cancel pending axios requests using AbortController
		// - Clear any custom axios interceptors
		// - Clear any timers or intervals
		// - Close WebSocket connections
	}
}
