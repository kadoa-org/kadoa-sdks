import { merge } from "es-toolkit";
import { KadoaSdkException } from "../../../runtime/exceptions";
import { ERROR_MESSAGES } from "../../../runtime/exceptions/base.exception";
import { logger } from "../../../runtime/logger";
import type { PageInfo } from "../../../runtime/pagination";
import type {
  NotificationChannel,
  NotificationChannelsService,
  NotificationOptions,
  NotificationSettings,
  NotificationSettingsService,
  NotificationSetupService,
} from "../../notifications";
import type { GetJobResponse, RunWorkflowRequest, RunWorkflowResponse, WorkflowsCoreService } from "../../workflows";
import type {
  FetchDataOptions,
  LocationConfig,
  SchemaField,
  WorkflowDetailsResponse,
  WorkflowInterval,
  WorkflowMonitoringConfig,
} from "../extraction.acl";
import type { DataFetcherService, ExportDataOptions, ExportDataResult, FetchDataResult } from "./data-fetcher.service";
import type { EntityConfig } from "./entity-resolver.service";

const debug = logger.extraction;

export interface ExtractionOptionsInternal {
  urls: string[];
  prompt?: string;
  mode: "run" | "submit";
  name?: string;
  description?: string;
  location: LocationConfig;
  bypassPreview?: boolean;
  pollingInterval: number;
  maxWaitTime: number;
  entity: EntityConfig;
  interval?: WorkflowInterval;
  monitoring?: WorkflowMonitoringConfig;
  tags?: string[];
  notifications?: NotificationOptions;
  autoStart?: boolean;
  additionalData?: Record<string, unknown>;
  userPrompt?: string;
  limit?: number;
}

export type ExtractionOptions = {
  urls: string[];
} & Partial<Omit<ExtractionOptionsInternal, "urls">>;

export interface ExtractionResult {
  workflowId: string;
  workflow?: WorkflowDetailsResponse;
  data?: Array<object>;
  pagination?: PageInfo;
}

export interface SubmitExtractionResult {
  workflowId: string;
  needsNotificationSetup?: boolean;
}

// Use TERMINAL_RUN_STATES from WorkflowsCoreService for consistency
const SUCCESSFUL_RUN_STATES = new Set(["FINISHED", "SUCCESS"]);
const DEFAULT_AGENTIC_PROMPT = "extract all the data for the main entity of this page";

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

export const DEFAULT_OPTIONS: Omit<ExtractionOptionsInternal, "urls" | "entity" | "fields" | "description"> = {
  mode: "run",
  pollingInterval: 5000,
  maxWaitTime: 300000,
  location: { type: "auto" },
  bypassPreview: true,
  autoStart: true,
} as const;
/**
 * Service for managing extraction workflows and data fetching
 */
export class ExtractionService {
  constructor(
    private readonly workflowsCoreService: WorkflowsCoreService,
    private readonly dataFetcherService: DataFetcherService,
    private readonly notificationSetupService: NotificationSetupService,
    private readonly notificationChannelsService: NotificationChannelsService,
    private readonly notificationSettingsService: NotificationSettingsService,
  ) {}

  /**
   * Run an extraction workflow and wait for completion.
   */
  async run(options: ExtractionOptions): Promise<ExtractionResult> {
    return await this.executeExtraction({ ...options, mode: "run" });
  }

  /**
   * Submit an extraction workflow for asynchronous processing.
   */
  async submit(options: ExtractionOptions): Promise<SubmitExtractionResult> {
    return await this.executeExtraction({ ...options, mode: "submit" });
  }

  /**
   * Trigger a workflow run without waiting for completion.
   */
  async runJob(workflowId: string, input: RunWorkflowRequest): Promise<RunWorkflowResponse> {
    return await this.workflowsCoreService.runWorkflow(workflowId, input);
  }

  /**
   * Trigger a workflow run and wait for the job to complete.
   */
  async runJobAndWait(workflowId: string, input: RunWorkflowRequest): Promise<GetJobResponse> {
    const result = await this.workflowsCoreService.runWorkflow(workflowId, input);
    return await this.workflowsCoreService.waitForJobCompletion(workflowId, result.jobId || "");
  }

  /**
   * Fetch a single page of extraction data.
   */
  async fetchData(options: FetchDataOptions): Promise<FetchDataResult> {
    return await this.dataFetcherService.fetchData(options);
  }

  /**
   * Fetch all extraction data across all pages.
   */
  async fetchAllData(options: FetchDataOptions): Promise<object[]> {
    return await this.dataFetcherService.fetchAllData(options);
  }

  /**
   * Materialize a full data export and receive a signed, self-authenticating
   * download URL. Supports `format: "csv" | "json"` (default `"csv"`). The
   * URL is valid until `expiresAt` and can be opened by external clients
   * without auth headers — download with `fetch(result.url)`.
   */
  async exportData(options: ExportDataOptions): Promise<ExportDataResult> {
    return await this.dataFetcherService.exportData(options);
  }

  /**
   * Iterate through extraction data pages.
   */
  fetchDataPages(options: FetchDataOptions): AsyncGenerator<FetchDataResult, void, unknown> {
    return this.dataFetcherService.fetchDataPages(options);
  }

  /**
   * List notification channels for a workflow.
   */
  async getNotificationChannels(workflowId: string): Promise<NotificationChannel[]> {
    return await this.notificationChannelsService.listChannels({ workflowId });
  }

  /**
   * List notification settings for a workflow.
   */
  async getNotificationSettings(workflowId: string): Promise<NotificationSettings[]> {
    return await this.notificationSettingsService.listSettings({ workflowId });
  }

  /**
   * execute extraction workflow
   */
  private async executeExtraction(options: ExtractionOptions & { mode?: "run" }): Promise<ExtractionResult>;
  private async executeExtraction(options: ExtractionOptions & { mode: "submit" }): Promise<SubmitExtractionResult>;
  private async executeExtraction(
    options: ExtractionOptions & { mode?: "run" | "submit" },
  ): Promise<ExtractionResult | SubmitExtractionResult> {
    this.validateOptions(options);

    const config: Omit<ExtractionOptionsInternal, "entity" | "fields"> = {
      ...merge(DEFAULT_OPTIONS, options),
    };

    const isRealTime = config.interval === "REAL_TIME";

    // Real-time workflows cannot use run()/submit() - they use a different execution model
    if (isRealTime) {
      throw new KadoaSdkException(
        "extraction.run()/submit() are not supported for real-time workflows. Use the builder API, call waitForReady(), and subscribe via client.realtime.onEvent(...).",
        {
          code: "BAD_REQUEST",
          details: {
            interval: "REAL_TIME",
          },
        },
      );
    }

    let workflowId: string;

    const entityConfig = options.entity;
    const resolvedEntity: { entity?: string; fields: Array<SchemaField> } = {
      entity: typeof entityConfig === "object" && "name" in entityConfig ? entityConfig.name : undefined,
      fields: typeof entityConfig === "object" && "fields" in entityConfig ? entityConfig.fields : [],
    };

    const hasNotifications = !!config.notifications;

    const userPrompt = buildAgenticPrompt({
      entity: resolvedEntity.entity,
      fields: resolvedEntity.fields,
      userPrompt: config.userPrompt,
    });

    const workflowRequest = {
      ...config,
      fields: resolvedEntity.fields,
      ...(resolvedEntity.entity !== undefined ? { entity: resolvedEntity.entity } : {}),
      userPrompt,
    };

    const result = await this.workflowsCoreService.create(workflowRequest);
    workflowId = result.id;

    if (hasNotifications) {
      //note: for now we rely on the fact that notifcations will be setup faster than first event is emitted
      // in few days, we should be able to create workflow without starting it immediately so we will be 100%
      //  sure that notifications are setup before first event is emitted
      const result = await this.notificationSetupService.setup({
        workflowId,
        events: config.notifications?.events,
        channels: config.notifications?.channels,
      });
      debug(
        "Notifications setup: %O",
        result.map((r) => ({ id: r.id, eventType: r.eventType })),
      );
    }

    if (config.mode === "submit") {
      return {
        workflowId,
      };
    }

    const workflow = await this.workflowsCoreService.wait(workflowId, {
      pollIntervalMs: config.pollingInterval,
      timeoutMs: config.maxWaitTime,
    });

    let data: Array<object> | undefined;
    let pagination: PageInfo | undefined;
    const isSuccess = this.isExtractionSuccessful(workflow.runState);

    if (isSuccess) {
      const dataPage = await this.dataFetcherService.fetchData({ workflowId });
      data = dataPage.data;
      pagination = dataPage.pagination;
    } else {
      throw new KadoaSdkException(`${ERROR_MESSAGES.WORKFLOW_UNEXPECTED_STATUS}: ${workflow.runState}`, {
        code: "INTERNAL_ERROR",
        details: {
          workflowId,
          runState: workflow.runState,
          state: workflow.state,
        },
      });
    }

    return {
      workflowId,
      workflow,
      data,
      pagination,
    };
  }

  /**
   * Validates extraction options
   */
  private validateOptions(options: ExtractionOptions): void {
    if (!options.urls || options.urls.length === 0) {
      throw new KadoaSdkException(ERROR_MESSAGES.NO_URLS, {
        code: "VALIDATION_ERROR",
      });
    }
  }

  /**
   * Resume a workflow after notification setup
   */
  async resumeWorkflow(workflowId: string): Promise<ExtractionResult> {
    await this.workflowsCoreService.resume(workflowId);

    const workflow = await this.workflowsCoreService.wait(workflowId, {
      pollIntervalMs: DEFAULT_OPTIONS.pollingInterval,
      timeoutMs: DEFAULT_OPTIONS.maxWaitTime,
    });

    let data: Array<object> | undefined;
    let pagination: PageInfo | undefined;
    const isSuccess = this.isExtractionSuccessful(workflow.runState);

    if (isSuccess) {
      const dataPage = await this.dataFetcherService.fetchData({ workflowId });
      data = dataPage.data;
      pagination = dataPage.pagination;
    } else {
      throw new KadoaSdkException(`${ERROR_MESSAGES.WORKFLOW_UNEXPECTED_STATUS}: ${workflow.runState}`, {
        code: "INTERNAL_ERROR",
        details: {
          workflowId,
          runState: workflow.runState,
          state: workflow.state,
        },
      });
    }

    return {
      workflowId,
      workflow,
      data,
      pagination,
    };
  }

  /**
   * Checks if extraction was successful
   */
  private isExtractionSuccessful(runState: string | undefined): boolean {
    return runState ? SUCCESSFUL_RUN_STATES.has(runState.toUpperCase()) : false;
  }
}
