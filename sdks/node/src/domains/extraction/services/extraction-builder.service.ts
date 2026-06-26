import assert from "node:assert";
import { KadoaHttpException, KadoaSdkException } from "../../../runtime/exceptions";
import { logger } from "../../../runtime/logger";
import type { NotificationOptions, NotificationSetupService } from "../../notifications/notification-setup.service";
import { SchemaBuilder } from "../../schemas/schema-builder";
import type { GetWorkflowResponse } from "../../workflows/workflows.acl";
import type { WorkflowsCoreService } from "../../workflows/workflows-core.service";
import type {
  FetchDataOptions,
  LocationConfig,
  SchemaField,
  WorkflowInterval,
  WorkflowMonitoringConfig,
} from "../extraction.acl";
import type { DataFetcherService, FetchDataResult } from "./data-fetcher.service";
import type { EntityConfig } from "./entity-resolver.service";

const debug = logger.extraction;
const DEFAULT_AGENTIC_PROMPT = "extract all the data for the main entity of this page";
const BUILD_NOT_READY_ERROR = "No completed build. Build the project first.";
const TERMINAL_RUN_STATES = new Set(["FINISHED", "SUCCESS", "FAILED", "ERROR", "STOPPED", "CANCELLED"]);

function getFieldName(field: SchemaField): string | undefined {
  return "name" in field && typeof field.name === "string" ? field.name : undefined;
}

function buildAgenticPrompt(params: { entity?: string; fields: Array<SchemaField>; userPrompt?: string }): string {
  if (params.userPrompt) {
    return params.userPrompt;
  }

  const fieldNames = params.fields.map((field) => getFieldName(field)).filter((name): name is string => Boolean(name));

  if (fieldNames.length === 0) {
    return DEFAULT_AGENTIC_PROMPT;
  }

  const fieldList = fieldNames.join(", ");
  if (params.entity) {
    return `extract all ${params.entity} entities from this page and return these fields: ${fieldList}`;
  }

  return `extract all records from this page and return these fields: ${fieldList}`;
}

export interface ExtractOptionsInternal {
  urls: string[];
  name?: string;
  description?: string;
  entity: EntityConfig;
  bypassPreview?: boolean;
  interval?: WorkflowInterval;
  schedules?: string[];
  location?: LocationConfig;
  additionalData?: Record<string, unknown>;
  userPrompt?: string;
}

export interface ExtractOptions extends Omit<ExtractOptionsInternal, "entity"> {
  extraction?: (builder: SchemaBuilder) => SchemaBuilder | { schemaId: string };
}

export interface PreparedExtraction {
  options: ExtractOptionsInternal;
  withNotifications: (options: NotificationOptions) => PreparedExtraction;

  withMonitoring: (options: WorkflowMonitoringConfig) => PreparedExtraction;

  setInterval: (options: { interval: WorkflowInterval } | { schedules: string[] }) => PreparedExtraction;

  bypassPreview: () => PreparedExtraction;

  setLocation: (options: LocationConfig) => PreparedExtraction;

  withPrompt: (prompt: string) => PreparedExtraction;

  create: () => Promise<CreatedExtraction>;
}

export interface RunWorkflowOptions {
  /**
   * Optional variables to pass to the workflow execution.
   */
  variables?: Record<string, unknown>;

  /**
   * Optional limit for the number of records to process.
   */
  limit?: number;
}

export interface CreatedExtraction {
  options: ExtractOptionsInternal;
  workflowId: string;
  waitForReady: (options?: WaitForReadyOptions) => Promise<GetWorkflowResponse>;
  run: (options?: RunWorkflowOptions) => Promise<FinishedExtraction>;
  submit: (options?: RunWorkflowOptions) => Promise<SubmittedExtraction>;
}

export interface WaitForReadyOptions {
  targetState?: "PREVIEW" | "ACTIVE";
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export interface SubmittedExtraction {
  workflowId: string;
  jobId: string;
}

export interface FinishedExtraction {
  jobId: string;

  fetchData: (options: Omit<FetchDataOptions, "workflowId" | "runId">) => Promise<FetchDataResult>;
  fetchAllData: (options: Omit<FetchDataOptions, "workflowId" | "runId" | "page" | "limit">) => Promise<object[]>;
}

export class ExtractionBuilderService {
  private _options: ExtractOptionsInternal | undefined;
  private _workflowId: string | undefined;
  private _jobId: string | undefined;
  private _notificationOptions: NotificationOptions | undefined;
  private _monitoringOptions: WorkflowMonitoringConfig | undefined;
  private _userPrompt: string | undefined;

  get options(): ExtractOptionsInternal {
    assert(this._options, "Options are not set");
    return this._options;
  }

  get notificationOptions(): NotificationOptions | undefined {
    return this._notificationOptions;
  }

  get monitoringOptions(): WorkflowMonitoringConfig | undefined {
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
    private readonly dataFetcherService: DataFetcherService,
    private readonly notificationSetupService: NotificationSetupService,
  ) {}

  extract({
    urls,
    name,
    description,
    extraction,
    additionalData,
    bypassPreview,
    userPrompt,
    interval,
    schedules,
    location,
  }: ExtractOptions): PreparedExtraction {
    let entity: EntityConfig = "ai-detection";
    let builtFields: Array<SchemaField> = [];

    if (extraction) {
      const result = extraction(new SchemaBuilder());

      if ("schemaId" in result) {
        entity = { schemaId: result.schemaId };
      } else {
        const builtSchema = result.build();
        builtFields = builtSchema.fields;
        entity = builtSchema.entityName
          ? { name: builtSchema.entityName, fields: builtFields }
          : { fields: builtFields };
      }
    }

    this._userPrompt = userPrompt;

    this._options = {
      urls,
      name,
      description,
      entity,
      bypassPreview: bypassPreview ?? false,
      additionalData,
      userPrompt,
      interval,
      schedules,
      location,
    };
    return this;
  }

  withNotifications(options: Omit<NotificationOptions, "workflowId">): PreparedExtraction {
    this._notificationOptions = options;

    return this;
  }

  withMonitoring(options: WorkflowMonitoringConfig): PreparedExtraction {
    this._monitoringOptions = options;
    return this;
  }

  bypassPreview(): PreparedExtraction {
    assert(this._options, "Options are not set");
    this._options.bypassPreview = true;
    return this;
  }

  setInterval(options: { interval: WorkflowInterval } | { schedules: string[] }): PreparedExtraction {
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

  withPrompt(prompt: string): PreparedExtraction {
    assert(this._options, "Options are not set");
    this._userPrompt = prompt;
    this._options.userPrompt = prompt;
    return this;
  }

  async create(): Promise<CreatedExtraction> {
    assert(this._options, "Options are not set");
    const { urls, name, description, entity } = this.options;

    const resolvedEntity: { entity?: string; fields: Array<SchemaField> } = {
      entity: typeof entity === "object" && "name" in entity ? entity.name : undefined,
      fields: typeof entity === "object" && "fields" in entity ? entity.fields : [],
    };

    this._userPrompt = buildAgenticPrompt({
      entity: resolvedEntity.entity,
      fields: resolvedEntity.fields,
      userPrompt: this._userPrompt,
    });
    this._options.userPrompt = this._userPrompt;

    const schemaId = typeof entity === "object" && "schemaId" in entity ? entity.schemaId : undefined;
    const hasSchemaId = Boolean(schemaId);

    const workflow = await this.workflowsCoreService.create({
      urls,
      name,
      description,
      monitoring: this._monitoringOptions,
      ...(hasSchemaId
        ? {
            schemaId,
            entity: resolvedEntity.entity,
            fields: resolvedEntity.fields,
          }
        : { entity: resolvedEntity.entity, fields: resolvedEntity.fields }),
      autoStart: false,
      interval: this._options.interval,
      schedules: this._options.schedules,
      additionalData: this._options.additionalData,
      bypassPreview: this._options.bypassPreview,
      userPrompt: this._userPrompt,
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

  async waitForReady(options?: WaitForReadyOptions): Promise<GetWorkflowResponse> {
    assert(this._workflowId, "Workflow ID is not set");
    const targetState = options?.targetState ?? "PREVIEW";

    const current = await this.workflowsCoreService.get(this._workflowId);
    if (current.state === targetState || (targetState === "PREVIEW" && current.state === "ACTIVE")) {
      return current;
    }

    const workflow = await this.workflowsCoreService.wait(this._workflowId, {
      targetState,
      pollIntervalMs: options?.pollIntervalMs,
      timeoutMs: options?.timeoutMs,
    });

    return workflow;
  }

  async run(options?: RunWorkflowOptions): Promise<FinishedExtraction> {
    assert(this._options, "Options are not set");
    assert(this._workflowId, "Workflow ID is not set");

    if (this._options.interval === "REAL_TIME") {
      throw new KadoaSdkException(
        "run() is not supported for real-time workflows. Use waitForReady() and subscribe via client.realtime.onEvent(...).",
        {
          code: "BAD_REQUEST",
          details: {
            interval: "REAL_TIME",
            workflowId: this._workflowId,
          },
        },
      );
    }

    const startedJob = await this.startOrReuseWorkflowRun(this._workflowId, {
      variables: options?.variables,
      limit: options?.limit,
    });
    assert(startedJob.jobId, "Job ID is not set"); //todo: I am not sure about this
    debug("Job started: %O", startedJob);
    this._jobId = startedJob.jobId;

    const finishedJob = await this.workflowsCoreService.waitForJobCompletion(this._workflowId, startedJob.jobId);
    debug("Job finished: %O", finishedJob);

    return this;
  }
  async submit(options?: RunWorkflowOptions): Promise<SubmittedExtraction> {
    assert(this._options, "Options are not set");
    assert(this._workflowId, "Workflow ID is not set");

    if (this._options.interval === "REAL_TIME") {
      throw new KadoaSdkException(
        "submit() is not supported for real-time workflows. Use waitForReady() and subscribe via client.realtime.onEvent(...).",
        {
          code: "BAD_REQUEST",
          details: {
            interval: "REAL_TIME",
            workflowId: this._workflowId,
          },
        },
      );
    }

    const submittedJob = await this.startOrReuseWorkflowRun(this._workflowId, {
      variables: options?.variables,
      limit: options?.limit,
    });
    assert(submittedJob.jobId, "Job ID is not set"); //todo: I am not sure about this
    debug("Job submitted: %O", submittedJob);

    this._jobId = submittedJob.jobId;

    return {
      workflowId: this._workflowId,
      jobId: this._jobId,
    };
  }

  async fetchData(options: Omit<FetchDataOptions, "workflowId" | "runId">): Promise<FetchDataResult> {
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

  async fetchAllData(options: Omit<FetchDataOptions, "workflowId" | "runId" | "page" | "limit">): Promise<object[]> {
    assert(this._jobId, "Job ID is not set");
    assert(this._workflowId, "Workflow ID is not set");
    return this.dataFetcherService.fetchAllData({
      workflowId: this._workflowId,
      runId: this._jobId,
      ...options,
    });
  }

  private async startOrReuseWorkflowRun(workflowId: string, input: RunWorkflowOptions) {
    // Some agentic workflows already have an active job by the time create()
    // returns, so reuse that run instead of issuing a duplicate /run request.
    const currentJob = await this.findActiveWorkflowJob(workflowId);
    if (currentJob) {
      debug("Reusing active workflow job: %O", currentJob);
      return currentJob;
    }

    try {
      return await this.workflowsCoreService.runWorkflow(workflowId, input);
    } catch (error) {
      if (!this.isBuildNotReadyError(error)) {
        throw error;
      }

      const recoveredJob = await this.waitForWorkflowJob(workflowId);
      if (recoveredJob) {
        debug("Recovered active workflow job after run rejection: %O", recoveredJob);
        return recoveredJob;
      }

      throw error;
    }
  }

  private async findActiveWorkflowJob(workflowId: string) {
    const workflow = await this.workflowsCoreService.get(workflowId);
    if (!workflow.jobId || !workflow.runState) {
      return undefined;
    }

    if (TERMINAL_RUN_STATES.has(workflow.runState.toUpperCase())) {
      return undefined;
    }

    return {
      jobId: workflow.jobId,
      status: workflow.runState,
      message: "Workflow already has an active run",
    };
  }

  private async waitForWorkflowJob(workflowId: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const currentJob = await this.findActiveWorkflowJob(workflowId);
      if (currentJob) {
        return currentJob;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return undefined;
  }

  private isBuildNotReadyError(error: unknown): boolean {
    if (!(error instanceof KadoaHttpException)) {
      return false;
    }

    const responseBody = error.responseBody;
    if (
      responseBody &&
      typeof responseBody === "object" &&
      "error" in responseBody &&
      typeof responseBody.error === "string"
    ) {
      return responseBody.error.includes(BUILD_NOT_READY_ERROR);
    }

    return typeof error.message === "string" ? error.message.includes(BUILD_NOT_READY_ERROR) : false;
  }
}
