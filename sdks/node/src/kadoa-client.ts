import type { AxiosInstance } from "axios";
import axios, { AxiosError } from "axios";
import { v4 } from "uuid";
import {
  Configuration,
  NotificationsApi,
  WorkflowsApi,
} from "./domains/apis.acl";
import { DataFetcherService } from "./domains/extraction/services/data-fetcher.service";
import { EntityResolverService } from "./domains/extraction/services/entity-resolver.service";
import { ExtractionService } from "./domains/extraction/services/extraction.service";
import {
  ExtractionBuilderService,
  type ExtractOptions,
  type PreparedExtraction,
} from "./domains/extraction/services/extraction-builder.service";
import {
  type NotificationOptions,
  type NotificationSettings,
  NotificationSetupService,
  type SetupWorkflowNotificationSettingsRequest,
  type SetupWorkspaceNotificationSettingsRequest,
} from "./domains/notifications";
import { NotificationChannelsService } from "./domains/notifications/notification-channels.service";
import { NotificationSettingsService } from "./domains/notifications/notification-settings.service";
import { Realtime } from "./domains/realtime/realtime";
import { SchemasService } from "./domains/schemas/schemas.service";
import type { KadoaUser } from "./domains/user/user.service";
import { UserService } from "./domains/user/user.service";
import {
  createValidationDomain,
  type ValidationDomain,
} from "./domains/validation/validation.facade";
import { ValidationCoreService } from "./domains/validation/validation-core.service";
import { ValidationRulesService } from "./domains/validation/validation-rules.service";
import { WorkflowsCoreService } from "./domains/workflows/workflows-core.service";
import { PUBLIC_API_URI } from "./runtime/config";
import { KadoaErrorCode, KadoaHttpException } from "./runtime/exceptions";
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
}

export interface NotificationDomain {
  channels: NotificationChannelsService;
  settings: NotificationSettingsService;
  setup: NotificationSetupService;
  configure(options: NotificationOptions): Promise<NotificationSettings[]>;
  setupForWorkflow(
    requestData: SetupWorkflowNotificationSettingsRequest,
  ): Promise<NotificationSettings[]>;
  setupForWorkspace(
    requestData: SetupWorkspaceNotificationSettingsRequest,
  ): Promise<NotificationSettings[]>;
}

export type { ValidationDomain } from "./domains/validation/validation.facade";

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
export class KadoaClient {
  private readonly _configuration: Configuration;
  private readonly _axiosInstance: AxiosInstance;
  private readonly _baseUrl: string;
  private readonly _timeout: number;
  private readonly _apiKey: string;

  private _realtime?: Realtime;
  private _extractionBuilderService: ExtractionBuilderService;

  public readonly extraction: ExtractionService;
  public readonly workflow: WorkflowsCoreService;
  public readonly notification: NotificationDomain;
  public readonly schema: SchemasService;
  public readonly user: UserService;
  public readonly validation: ValidationDomain;

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

    //todo: use proper DI container,

    //apis
    const workflowsApi = new WorkflowsApi(
      this.configuration,
      this.baseUrl,
      this.axiosInstance,
    );

    const notificationsApi = new NotificationsApi(
      this.configuration,
      this.baseUrl,
      this.axiosInstance,
    );

    //services
    const userService = new UserService(this);
    const dataFetcherService = new DataFetcherService(workflowsApi);
    const channelsService = new NotificationChannelsService(
      notificationsApi,
      userService,
    );
    const settingsService = new NotificationSettingsService(notificationsApi);
    const entityResolverService = new EntityResolverService(this);
    const workflowsCoreService = new WorkflowsCoreService(workflowsApi);
    const schemasService = new SchemasService(this);
    const channelSetupService = new NotificationSetupService(
      channelsService,
      settingsService,
    );
    const coreService = new ValidationCoreService(this);
    const rulesService = new ValidationRulesService(this);
    const extractionService = new ExtractionService(
      workflowsCoreService,
      dataFetcherService,
      entityResolverService,
      channelSetupService,
      channelsService,
      settingsService,
    );
    this._extractionBuilderService = new ExtractionBuilderService(
      workflowsCoreService,
      entityResolverService,
      dataFetcherService,
      channelSetupService,
    );

    // domain services
    this.user = userService;
    this.extraction = extractionService;
    this.workflow = workflowsCoreService;
    this.schema = schemasService;
    this.notification = {
      channels: channelsService,
      settings: settingsService,
      setup: channelSetupService,
      configure: (options: NotificationOptions) =>
        channelSetupService.setup(options),
      setupForWorkflow: (
        request: SetupWorkflowNotificationSettingsRequest,
      ): Promise<NotificationSettings[]> =>
        channelSetupService.setupForWorkflow(request),
      setupForWorkspace: (
        request: SetupWorkspaceNotificationSettingsRequest,
      ): Promise<NotificationSettings[]> =>
        channelSetupService.setupForWorkspace(request),
    };
    this.validation = createValidationDomain(coreService, rulesService);

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
   *
   * @example Auto-detection
   * ```typescript
   * const extraction = await client.extract({
   *   urls: ["https://example.com"],
   *   name: "My Extraction"
   * }).create();
   * ```
   *
   * @example Raw extraction
   * ```typescript
   * const extraction = await client.extract({
   *   urls: ["https://example.com"],
   *   name: "My Extraction",
   *   extraction: builder => builder.raw("markdown")
   * }).create();
   * ```
   *
   * @example Custom schema
   * ```typescript
   * const extraction = await client.extract({
   *   urls: ["https://example.com"],
   *   name: "My Extraction",
   *   extraction: builder => builder
   *     .schema("Product")
   *     .field("title", "Product name", "STRING", { example: "Example" })
   *     .field("price", "Product price", "CURRENCY")
   * }).create();
   * ```
   */
  extract(options: ExtractOptions): PreparedExtraction {
    return this._extractionBuilderService.extract(options);
  }

  /**
   * Connect to realtime WebSocket server
   * Creates a new connection if not already connected
   *
   * @returns The Realtime instance
   */
  connectRealtime(): Realtime {
    if (!this._realtime) {
      this._realtime = new Realtime({ apiKey: this._apiKey });
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
