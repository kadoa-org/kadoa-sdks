import { PagedIterator, type PagedResponse } from "../../../runtime/pagination";
import type {
  DataSortOrder,
  FetchDataOptions,
  WorkflowsApiInterface,
} from "../extraction.acl";

export interface FetchDataResult extends PagedResponse<object> {
  workflowId: string;
  runId?: string | null;
  executedAt?: string | null;
}

export type ExportDataFormat = "csv" | "json";

/**
 * Options for requesting a materialized data export.
 */
export interface ExportDataOptions {
  workflowId: string;
  /**
   * Output format for the materialized export. Defaults to `"csv"`.
   */
  format?: ExportDataFormat;
  runId?: string;
  /**
   * JSON-encoded filter array; same shape accepted by the `/data` endpoint.
   */
  filters?: string;
  sortBy?: string;
  order?: DataSortOrder;
  /**
   * Comma-separated list (or JSON array) of row ids to include.
   */
  rowIds?: string;
}

/**
 * Result of {@link DataFetcherService.exportData}. The backend materializes
 * the full result set and returns a self-authenticating signed URL that can
 * be opened by external clients (browsers, Claude Desktop, sandboxes, etc.)
 * without an Authorization header. Valid until `expiresAt`.
 */
export interface ExportDataResult {
  workflowId: string;
  runId: string;
  executedAt?: string;
  format: ExportDataFormat;
  rowCount: number;
  url: string;
  expiresAt: string;
}

/**
 * Service for fetching workflow data with pagination support
 */
export class DataFetcherService {
  private readonly defaultLimit = 100;

  constructor(private readonly workflowsApi: WorkflowsApiInterface) {}

  /**
   * Fetch a page of workflow data
   */
  async fetchData(options: FetchDataOptions): Promise<FetchDataResult> {
    const response = await this.workflowsApi.v4WorkflowsWorkflowIdDataGet({
      ...options,
      page: options.page ?? 1,
      limit: options.limit ?? this.defaultLimit,
    });

    // The endpoint's response union includes a `download=link` variant
    // (which returns an exportId/downloadPath instead of paginated data).
    // The SDK doesn't expose that option, so the response is always the
    // streaming variant — narrow it for callers.
    return response.data as FetchDataResult;
  }

  /**
   * Fetch all pages of workflow data
   */
  async fetchAllData(options: FetchDataOptions): Promise<object[]> {
    const iterator = new PagedIterator((pageOptions) =>
      this.fetchData({ ...options, ...pageOptions }),
    );

    return iterator.fetchAll({ limit: options.limit ?? this.defaultLimit });
  }

  /**
   * Materialize the workflow's full data set and return a signed,
   * self-authenticating download URL. The URL works without an
   * Authorization header (suitable for browsers, Claude Desktop, code
   * execution sandboxes, etc.) and is valid until `expiresAt`. Callers
   * download with a plain `fetch(result.url)`.
   */
  async exportData(options: ExportDataOptions): Promise<ExportDataResult> {
    const response = await this.workflowsApi.v4WorkflowsWorkflowIdDataExportGet(
      {
        workflowId: options.workflowId,
        format: options.format,
        runId: options.runId,
        filters: options.filters,
        sortBy: options.sortBy,
        order: options.order,
        rowIds: options.rowIds,
      },
    );

    return response.data as ExportDataResult;
  }

  /**
   * Create an async iterator for paginated data fetching
   */
  async *fetchDataPages(
    options: FetchDataOptions,
  ): AsyncGenerator<FetchDataResult, void, unknown> {
    const iterator = new PagedIterator((pageOptions) =>
      this.fetchData({ ...options, ...pageOptions }),
    );

    for await (const page of iterator.pages({
      limit: options.limit ?? this.defaultLimit,
    })) {
      yield page as FetchDataResult;
    }
  }
}
