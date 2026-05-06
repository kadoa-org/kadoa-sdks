import { PagedIterator, type PagedResponse } from "../../../runtime/pagination";
import type {
  FetchDataOptions,
  WorkflowsApiInterface,
} from "../extraction.acl";

export interface FetchDataResult extends PagedResponse<object> {
  workflowId: string;
  runId?: string | null;
  executedAt?: string | null;
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
