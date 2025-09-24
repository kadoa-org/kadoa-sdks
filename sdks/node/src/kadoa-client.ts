import type { AxiosInstance } from "axios";
import axios, { AxiosError } from "axios";
import { v4 } from "uuid";
import {
	Configuration,
	CrawlerApi,
	type CrawlerApiInterface,
	NotificationsApi,
	type NotificationsApiInterface,
	WorkflowsApi,
	type WorkflowsApiInterface,
	WorkspacesApi,
	type WorkspacesApiInterface,
} from "./generated";
import { Realtime } from "./internal/domains/realtime/realtime";
import type { KadoaUser } from "./internal/domains/user/user.service";
import { PUBLIC_API_URI } from "./internal/runtime/config";
import {
	KadoaErrorCode,
	KadoaHttpException,
} from "./internal/runtime/exceptions";
import type { ApiProvider } from "./internal/runtime/http/api-provider";
import { ExtractionModule } from "./modules/extraction.module";
import { NotificationsModule } from "./modules/notifications.module";
import { SchemasModule } from "./modules/schemas.module";
import { UserModule } from "./modules/user.module";
import { WorkflowsModule } from "./modules/workflows.module";
import { SDK_LANGUAGE, SDK_NAME, SDK_VERSION } from "./version";

export interface KadoaClientStatus {
	baseUrl: string;
	user: KadoaUser;
	realtimeConnected: boolean;
}

export interface KadoaClientConfig {
	apiKey: string;
	timeout?: number;
	/**
	 * Enable realtime WebSocket connection
	 */
	enableRealtime?: boolean;
	/**
	 * Optional realtime configuration
	 */
	realtimeConfig?: {
		/** Auto-connect on client initialization (default: true) */
		autoConnect?: boolean;
		/** Delay between reconnection attempts in ms (default: 5000) */
		reconnectDelay?: number;
		/** Heartbeat interval in ms (default: 10000) */
		heartbeatInterval?: number;
	};
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
	private readonly _apiKey: string;

	private readonly _workflowsApi: WorkflowsApiInterface;
	private readonly _crawlApi: CrawlerApiInterface;
	private readonly _notificationsApi: NotificationsApiInterface;
	private readonly _workspacesApi: WorkspacesApiInterface;
	private _realtime?: Realtime;
	public readonly extraction: ExtractionModule;
	public readonly workflow: WorkflowsModule;
	public readonly notification: NotificationsModule;
	public readonly schemas: SchemasModule;
	public readonly user: UserModule;

	constructor(config: KadoaClientConfig) {
		this._baseUrl = PUBLIC_API_URI;
		this._timeout = config.timeout || 30000;
		this._apiKey = config.apiKey;

		const headers = {
			"User-Agent": `${SDK_NAME}/${SDK_VERSION}`,
			"X-SDK-Version": SDK_VERSION,
			"X-SDK-Language": SDK_LANGUAGE,
		};

		this._configuration = new Configuration({
			apiKey: this._apiKey,
			basePath: this._baseUrl,
			baseOptions: {
				headers,
			},
		});

		this._axiosInstance = axios.create({
			timeout: this._timeout,
			headers,
		});

		this._axiosInstance.interceptors.request.use((config) => {
			config.headers["x-request-id"] = v4();
			return config;
		});

		this._axiosInstance.interceptors.response.use(
			(response) => {
				if (response.status === 401) {
					throw new KadoaHttpException("Unauthorized", {
						code: KadoaErrorCode.AUTH_ERROR,
						httpStatus: 401,
					});
				}

				return response;
			},
			(error) => {
				if (error instanceof AxiosError) {
					const status = error.response?.status;
					if (status === 400) {
						throw KadoaHttpException.wrap(error);
					}
				}

				throw KadoaHttpException.wrap(error);
			},
		);

		this._workflowsApi =
			config.apiOverrides?.workflows ||
			new WorkflowsApi(this._configuration, this._baseUrl, this._axiosInstance);
		this._crawlApi =
			config.apiOverrides?.crawl ||
			new CrawlerApi(this._configuration, this._baseUrl, this._axiosInstance);
		this._notificationsApi =
			config.apiOverrides?.notifications ||
			new NotificationsApi(
				this._configuration,
				this._baseUrl,
				this._axiosInstance,
			);
		this._workspacesApi =
			config.apiOverrides?.workspaces ||
			new WorkspacesApi(
				this._configuration,
				this._baseUrl,
				this._axiosInstance,
			);
		//todo: use proper DI container, until then, make sure that user module  as first module
		this.user = new UserModule(this);
		this.extraction = new ExtractionModule(this);
		this.workflow = new WorkflowsModule(this);
		this.schemas = new SchemasModule(this);
		this.notification = new NotificationsModule(this);

		if (config.enableRealtime && config.realtimeConfig?.autoConnect !== false) {
			this.connectRealtime();
		}
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
	 * Get the API key
	 *
	 * @returns The API key
	 */
	get apiKey(): string {
		return this._apiKey;
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
	 * Get the workflows API
	 */
	get workflows(): WorkflowsApiInterface {
		return this._workflowsApi;
	}

	/**
	 * Get the crawl API
	 */
	get crawl(): CrawlerApiInterface {
		return this._crawlApi;
	}

	/**
	 * Get the notifications API
	 */
	get notifications(): NotificationsApiInterface {
		return this._notificationsApi;
	}

	/**
	 * Get the workspaces API
	 */
	get workspaces(): WorkspacesApiInterface {
		return this._workspacesApi;
	}

	/**
	 * Get the realtime connection (if enabled)
	 */
	get realtime(): Realtime | undefined {
		return this._realtime;
	}

	/**
	 * Connect to realtime WebSocket server
	 * Creates a new connection if not already connected
	 *
	 * @returns The Realtime instance
	 */
	connectRealtime(): Realtime {
		if (!this._realtime) {
			this._realtime = new Realtime({ teamApiKey: this._apiKey });
			this._realtime.connect();
		}
		return this._realtime;
	}

	/**
	 * Disconnect from realtime WebSocket server
	 */
	disconnectRealtime(): void {
		if (this._realtime) {
			this._realtime.close();
			this._realtime = undefined;
		}
	}

	/**
	 * Check if realtime connection is active
	 *
	 * @returns True if connected, false otherwise
	 */
	isRealtimeConnected(): boolean {
		return this._realtime?.isConnected() ?? false;
	}

	/**
	 * Get the status of the client
	 *
	 * @returns The status of the client
	 */
	async status(): Promise<KadoaClientStatus> {
		return {
			baseUrl: this._baseUrl,
			user: await this.user.getCurrentUser(),
			realtimeConnected: this.isRealtimeConnected(),
		};
	}

	/**
	 * Dispose of the client and clean up resources
	 */
	dispose(): void {
		// Clean up WebSocket connection if active
		this.disconnectRealtime();

		// Note: API clients use WeakMap caching and will be automatically
		// garbage collected when the client instance is no longer referenced.
		// The axios instance itself doesn't require explicit cleanup as it
		// doesn't maintain persistent connections or resources.

		// Future cleanup that could be added if needed:
		// - Cancel pending axios requests using AbortController
		// - Clear any custom axios interceptors
		// - Clear any timers or intervals
	}
}
