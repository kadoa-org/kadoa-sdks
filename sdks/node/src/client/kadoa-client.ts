import type { AxiosInstance } from "axios";
import type { Configuration } from "../domains/apis.acl";
import type { ExtractionService } from "../domains/extraction/services/extraction.service";
import type {
  ExtractionBuilderService,
  ExtractOptions,
  PreparedExtraction,
} from "../domains/extraction/services/extraction-builder.service";
import { Realtime, type RealtimeConfig } from "../domains/realtime";
import type { SchemasService } from "../domains/schemas/schemas.service";
import type { UserService } from "../domains/user/user.service";
import type { ValidationDomain } from "../domains/validation/validation.facade";
import type { WorkflowsCoreService } from "../domains/workflows/workflows-core.service";
import { PUBLIC_API_URI } from "../runtime/config";
import { checkForUpdates } from "../runtime/utils/version-check";
import type {
  KadoaClientConfig,
  KadoaClientStatus,
  NotificationDomain,
} from "./types";
import {
  createApis,
  createAxiosInstance,
  createClientDomains,
  createOpenApiConfiguration,
  createSdkHeaders,
} from "./wiring";

/**
 * KadoaClient provides an object-oriented interface to the Kadoa SDK
 *
 * @example
 * ```typescript
 * import { KadoaClient } from '@kadoa/node-sdk';
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
export class KadoaClient {
  private readonly _configuration: Configuration;
  private readonly _axiosInstance: AxiosInstance;
  private readonly _baseUrl: string;
  private readonly _timeout: number;
  private readonly _apiKey: string;

  private _realtime?: Realtime;
  private readonly _extractionBuilderService: ExtractionBuilderService;

  public readonly extraction: ExtractionService;
  public readonly workflow: WorkflowsCoreService;
  public readonly notification: NotificationDomain;
  public readonly schema: SchemasService;
  public readonly user: UserService;
  public readonly validation: ValidationDomain;

  constructor(config: KadoaClientConfig) {
    this._baseUrl = config.baseUrl ?? PUBLIC_API_URI;
    this._timeout = config.timeout ?? 30000;
    this._apiKey = config.apiKey;

    const headers = createSdkHeaders();

    this._configuration = createOpenApiConfiguration({
      apiKey: this._apiKey,
      baseUrl: this._baseUrl,
      headers,
    });

    this._axiosInstance = createAxiosInstance({
      timeout: this._timeout,
      headers,
    });

    const apis = createApis({
      configuration: this.configuration,
      baseUrl: this.baseUrl,
      axiosInstance: this.axiosInstance,
    });

    const domains = createClientDomains({ client: this, apis });

    this.user = domains.user;
    this.extraction = domains.extraction;
    this.workflow = domains.workflow;
    this.schema = domains.schema;
    this.notification = domains.notification;
    this.validation = domains.validation;
    this._extractionBuilderService = domains.extractionBuilderService;

    // Check for updates in the background (non-blocking)
    checkForUpdates().catch(() => {
      // Silently ignore errors - version check should not affect client initialization
    });
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
   * Get the realtime connection (if enabled)
   */
  get realtime(): Realtime | undefined {
    return this._realtime;
  }

  /**
   * Create a prepared extraction using the fluent builder API
   *
   * @param options - Extraction options including URLs and optional extraction builder
   * @returns PreparedExtraction that can be configured with notifications, monitoring, etc.
   */
  extract(options: ExtractOptions): PreparedExtraction {
    return this._extractionBuilderService.extract(options);
  }

  /**
   * Connect to realtime WebSocket server
   * Creates a new connection if not already connected
   *
   * @param options - Optional realtime tuning options (heartbeat/reconnect settings)
   * @returns The Realtime instance
   */
  async connectRealtime(
    options?: Omit<RealtimeConfig, "apiKey">,
  ): Promise<Realtime> {
    if (!this._realtime) {
      this._realtime = new Realtime({ apiKey: this._apiKey, ...options });
      await this._realtime.connect();
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
  }

  /**
   * Alias for {@link dispose}. Included for common Node.js client ergonomics.
   */
  close(): void {
    this.dispose();
  }
}
