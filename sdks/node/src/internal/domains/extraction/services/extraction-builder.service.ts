import assert from "node:assert";
import type { WorkflowsCoreService } from "../../workflows/workflows-core.service";
import type {
  NavigationMode,
  LocationConfig,
  WorkflowInterval,
} from "../extraction.types";
import type {
  EntityConfig,
  EntityResolverService,
} from "./entity-resolver.service";
import type {
  DataFetcherService,
  FetchDataOptions,
  FetchDataResult,
} from "./data-fetcher.service";
import { logger } from "../../../runtime/logger";
import type {
  NotificationSetupService,
  NotificationOptions,
} from "../../notifications/notification-setup.service";
import type { MonitoringConfig } from "../../../../generated";
import { KadoaSdkException } from "../../../runtime/exceptions";
import { ERROR_MESSAGES } from "../../../runtime/exceptions/base.exception";
import { SchemaBuilder } from "../../schemas/schema-builder";

const debug = logger.extraction;

export interface ExtractOptionsInternal {
  urls: string[];
  name: string;
  description?: string;
  navigationMode: NavigationMode;
  entity: EntityConfig;
  bypassPreview?: boolean;
  interval?: WorkflowInterval;
  schedules?: string[];
  location?: LocationConfig;
}

export interface ExtractOptions
  extends Omit<ExtractOptionsInternal, "navigationMode" | "entity"> {
  navigationMode?: NavigationMode;
  /**
   * Extraction configuration builder function
   * @example
   * ```typescript
   * extraction: builder => builder
   *   .schema("Product")
   *   .field("title", "Product name", "STRING", { example: "Example Product" })
   *   .field("price", "Product price", "CURRENCY")
   * ```
   */
  extraction?: (builder: SchemaBuilder) => SchemaBuilder | { schemaId: string };
}

export interface PreparedExtraction {
  options: ExtractOptionsInternal;
  withNotifications: (options: NotificationOptions) => PreparedExtraction;

  withMonitoring: (options: MonitoringConfig) => PreparedExtraction;

  setInterval: (
    options: { interval: WorkflowInterval } | { schedules: string[] },
  ) => PreparedExtraction;

  bypassPreview: () => PreparedExtraction;

  setLocation: (options: LocationConfig) => PreparedExtraction;

  create: () => Promise<CreatedExtraction>;
}

export interface RunWorkflowOptions {
  variables: Record<string, unknown>;
  limit: number;
}

export interface CreatedExtraction {
  options: ExtractOptionsInternal;
  workflowId: string;
  run: (options?: RunWorkflowOptions) => Promise<FinishedExtraction>;
  submit: (options?: RunWorkflowOptions) => Promise<SubmittedExtraction>;
}

export interface SubmittedExtraction {
  workflowId: string;
  jobId: string;
}

export interface FinishedExtraction {
  jobId: string;

  fetchData: (
    options: Omit<FetchDataOptions, "workflowId" | "runId">,
  ) => Promise<FetchDataResult>;
  fetchAllData: (
    options: Omit<FetchDataOptions, "workflowId" | "runId" | "page" | "limit">,
  ) => Promise<object[]>;
}

export class ExtractionBuilderService {
  private _options: ExtractOptionsInternal | undefined;
  private _workflowId: string | undefined;
  private _jobId: string | undefined;
  private _notificationOptions: NotificationOptions | undefined;
  private _monitoringOptions: MonitoringConfig | undefined;

  get options(): ExtractOptionsInternal {
    assert(this._options, "Options are not set");
    return this._options;
  }

  get notificationOptions(): NotificationOptions | undefined {
    return this._notificationOptions;
  }

  get monitoringOptions(): MonitoringConfig | undefined {
    return this._monitoringOptions;
  }

  get workflowId(): string {
    assert(this._workflowId, "Workflow ID is not set");
    return this._workflowId;
  }

  get jobId(): string {
    assert(this._jobId, "Job ID is not set");
    return this._jobId;
  }

  constructor(
    private readonly workflowsCoreService: WorkflowsCoreService,
    private readonly entityResolverService: EntityResolverService,
    private readonly dataFetcherService: DataFetcherService,
    private readonly notificationSetupService: NotificationSetupService,
  ) {}

  extract({
    urls,
    name,
    description,
    navigationMode,
    extraction,
  }: ExtractOptions): PreparedExtraction {
    let entity: EntityConfig = "ai-detection";

    if (extraction) {
      const result = extraction(new SchemaBuilder());

      if ("schemaId" in result) {
        entity = { schemaId: result.schemaId };
      } else {
        const builtSchema = result.build();
        entity = { name: builtSchema.entityName, fields: builtSchema.fields };
      }
    }

    this._options = {
      urls,
      name,
      description,
      navigationMode: navigationMode || "single-page",
      entity,
      bypassPreview: false,
    };
    return this;
  }

  withNotifications(
    options: Omit<NotificationOptions, "workflowId">,
  ): PreparedExtraction {
    this._notificationOptions = options;

    return this;
  }

  withMonitoring(options: MonitoringConfig): PreparedExtraction {
    this._monitoringOptions = options;
    return this;
  }

  bypassPreview(): PreparedExtraction {
    assert(this._options, "Options are not set");
    this._options.bypassPreview = true;
    return this;
  }

  setInterval(
    options: { interval: WorkflowInterval } | { schedules: string[] },
  ): PreparedExtraction {
    assert(this._options, "Options are not set");
    if ("interval" in options) {
      this._options.interval = options.interval;
    } else {
      this._options.interval = "CUSTOM";
      this._options.schedules = options.schedules;
    }
    return this;
  }

  setLocation(options: LocationConfig): PreparedExtraction {
    assert(this._options, "Options are not set");
    this._options.location = options;
    return this;
  }

  async create(): Promise<CreatedExtraction> {
    assert(this._options, "Options are not set");
    const { urls, name, description, navigationMode, entity } = this.options;
    const resolvedEntity =
      typeof entity === "object" && "schemaId" in entity
        ? undefined
        : await this.entityResolverService.resolveEntity(entity, {
            link: urls[0],
            location: this._options.location,
            navigationMode,
          });

    if (!resolvedEntity) {
      throw new KadoaSdkException(ERROR_MESSAGES.ENTITY_FETCH_FAILED, {
        code: "VALIDATION_ERROR",
        details: { entity },
      });
    }

    const workflow = await this.workflowsCoreService.create({
      urls,
      name,
      description,
      navigationMode,
      monitoring: this._monitoringOptions,
      schemaId:
        typeof entity === "object" && "schemaId" in entity
          ? entity.schemaId
          : undefined,
      entity: resolvedEntity.entity,
      fields: resolvedEntity.fields,
      autoStart: false,
      interval: this._options.interval,
      schedules: this._options.schedules,
    });

    if (this._notificationOptions) {
      await this.notificationSetupService.setup({
        ...this._notificationOptions,
        workflowId: workflow.id,
      });
    }

    this._workflowId = workflow.id;
    return this;
  }

  async run(options?: RunWorkflowOptions): Promise<FinishedExtraction> {
    assert(this._options, "Options are not set");
    assert(this._workflowId, "Workflow ID is not set");

    const startedJob = await this.workflowsCoreService.runWorkflow(
      this._workflowId,
      { variables: options?.variables, limit: options?.limit },
    );
    debug("Job started: %O", startedJob);
    this._jobId = startedJob.jobId;

    const finishedJob = await this.workflowsCoreService.waitForJobCompletion(
      this._workflowId,
      startedJob.jobId,
    );
    debug("Job finished: %O", finishedJob);

    return this;
  }
  async submit(options?: RunWorkflowOptions): Promise<SubmittedExtraction> {
    assert(this._options, "Options are not set");
    assert(this._workflowId, "Workflow ID is not set");

    const submittedJob = await this.workflowsCoreService.runWorkflow(
      this._workflowId,
      { variables: options?.variables, limit: options?.limit },
    );
    debug("Job submitted: %O", submittedJob);

    this._jobId = submittedJob.jobId;

    return {
      workflowId: this._workflowId,
      jobId: this._jobId,
    };
  }

  async fetchData(
    options: Omit<FetchDataOptions, "workflowId" | "runId">,
  ): Promise<FetchDataResult> {
    assert(this._workflowId, "Workflow ID is not set");
    assert(this._jobId, "Job ID is not set");
    return this.dataFetcherService.fetchData({
      workflowId: this._workflowId,
      runId: this._jobId,
      page: options.page ?? 1,
      limit: options.limit ?? 100,
      ...options,
    });
  }

  async fetchAllData(
    options: Omit<FetchDataOptions, "workflowId" | "runId" | "page" | "limit">,
  ): Promise<object[]> {
    assert(this._jobId, "Job ID is not set");
    assert(this._workflowId, "Workflow ID is not set");
    return this.dataFetcherService.fetchAllData({
      workflowId: this._workflowId,
      runId: this._jobId,
      ...options,
    });
  }
}
