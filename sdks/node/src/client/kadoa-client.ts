import type { AxiosInstance } from "axios";
import type { CrawlerDomain } from "../domains/crawler";
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
import type { VariablesService } from "../domains/variables/variables.service";
import type { WorkflowsCoreService } from "../domains/workflows/workflows-core.service";
import { PUBLIC_API_URI } from "../runtime/config";
import { KadoaSdkException } from "../runtime/exceptions";
import { checkForUpdates } from "../runtime/utils/version-check";
import { ApiRegistry } from "./api-registry";
import type {
  BearerAuthOptions,
  KadoaClientConfig,
  KadoaClientStatus,
  NotificationDomain,
  TeamInfo,
} from "./types";
import {
  createAxiosInstance,
  createClientDomains,
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
  private readonly _axiosInstance: AxiosInstance;
  private readonly _baseUrl: string;
  private readonly _apiKey: string;
  private _bearerToken: string | undefined;

  private _realtime?: Realtime;
  private readonly _extractionBuilderService: ExtractionBuilderService;

  public readonly apis: ApiRegistry;
  public readonly extraction: ExtractionService;
  public readonly workflow: WorkflowsCoreService;
  public readonly notification: NotificationDomain;
  public readonly schema: SchemasService;
  public readonly user: UserService;
  public readonly validation: ValidationDomain;
  public readonly variable: VariablesService;
  public readonly crawler: CrawlerDomain;

  constructor(config: KadoaClientConfig) {
    if (!config.apiKey && !config.bearerToken) {
      throw new KadoaSdkException(
        "Either apiKey or bearerToken must be provided",
        { code: "VALIDATION_ERROR" },
      );
    }

    this._baseUrl = config.baseUrl ?? PUBLIC_API_URI;
    this._apiKey = config.apiKey ?? "";
    this._bearerToken = config.bearerToken;

    const timeout = config.timeout ?? 30000;
    const headers = createSdkHeaders();

    this._axiosInstance = createAxiosInstance({ timeout, headers });

    // Auth interceptor: injects the correct auth header on every request.
    // Runs after per-request headers are set, so it can override them.
    this._axiosInstance.interceptors.request.use((reqConfig) => {
      if (this._bearerToken) {
        // Bearer mode: ensure Authorization header, remove stale x-api-key
        if (!reqConfig.headers["Authorization"]) {
          reqConfig.headers["Authorization"] = `Bearer ${this._bearerToken}`;
        }
        delete reqConfig.headers["x-api-key"];
      }
      return reqConfig;
    });

    // _apiKey is "" in bearer-only mode. Generated API clients will set
    // x-api-key: "" on requests; the auth interceptor above cleans this up
    // when _bearerToken is set (interceptors run after config-build time).
    this.apis = new ApiRegistry(
      this._apiKey,
      this._baseUrl,
      this._axiosInstance,
      headers,
    );

    const domains = createClientDomains({ client: this });

    this.user = domains.user;
    this.extraction = domains.extraction;
    this.workflow = domains.workflow;
    this.schema = domains.schema;
    this.notification = domains.notification;
    this.validation = domains.validation;
    this.variable = domains.variable;
    this.crawler = domains.crawler;
    this._extractionBuilderService = domains.extractionBuilderService;

    // Check for updates in the background (non-blocking)
    checkForUpdates().catch(() => {
      // Silently ignore errors - version check should not affect client initialization
    });
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
   * @returns The API key (empty string when using Bearer auth)
   */
  get apiKey(): string {
    return this._apiKey;
  }

  /**
   * Update the Bearer token used for authentication.
   * Call this after a Supabase JWT refresh so that subsequent requests
   * use the new token.
   */
  setBearerToken(token: string): void {
    this._bearerToken = token;
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
    if (!this._apiKey) {
      throw new KadoaSdkException(
        "Realtime requires an API key. Bearer-only auth is not supported for WebSocket connections.",
        { code: "VALIDATION_ERROR" },
      );
    }
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
   * List all teams accessible to the authenticated user.
   *
   * When called with a Bearer token (Supabase JWT), returns all teams the
   * human user belongs to. Without it, falls back to x-api-key auth which
   * only returns teams the service account (API key) belongs to.
   */
  async listTeams(opts?: BearerAuthOptions): Promise<TeamInfo[]> {
    // When opts.bearerToken is provided, override the instance-level auth.
    // Otherwise let the axios auth interceptor handle it.
    const headers: Record<string, string> | undefined = opts?.bearerToken
      ? { Authorization: `Bearer ${opts.bearerToken}` }
      : undefined;

    const response = await this._axiosInstance.get("/v5/user", {
      baseURL: this._baseUrl,
      ...(headers && { headers }),
    });

    return response.data?.teams ?? [];
  }

  /**
   * Switch the active team for this session.
   *
   * Calls `POST /v5/auth/active-team` which updates the server-side
   * session→team mapping. Subsequent requests with the same JWT are
   * automatically scoped to the new team — no token refresh needed.
   *
   * @param teamId - The team ID to switch to (must be a team the user belongs to)
   */
  async setActiveTeam(teamId: string): Promise<void> {
    if (!teamId?.trim()) {
      throw new KadoaSdkException("teamId is required", {
        code: "VALIDATION_ERROR",
      });
    }
    await this._axiosInstance.post(
      "/v5/auth/active-team",
      { teamId },
      { baseURL: this._baseUrl },
    );
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
