import type {
	V4WorkflowsWorkflowIdDataGet200Response,
	V4WorkflowsWorkflowIdDataGet200ResponsePagination,
	V4WorkflowsWorkflowIdDataGetOrderEnum,
	WorkflowsApiV4WorkflowsWorkflowIdDataGetRequest,
} from "../../../generated";
import { KadoaHttpException } from "../../../internal/runtime/exceptions";
import { ERROR_MESSAGES } from "../../../internal/runtime/exceptions/base.exception";
import type { ApiProvider } from "../../../internal/runtime/http/api-provider";
import {
	PagedIterator,
	type PagedResponse,
} from "../../../internal/runtime/pagination";

// Re-export generated types with cleaner names
export type DataPagination = V4WorkflowsWorkflowIdDataGet200ResponsePagination;
export type WorkflowDataResponse = V4WorkflowsWorkflowIdDataGet200Response;
export type DataSortOrder = V4WorkflowsWorkflowIdDataGetOrderEnum;

// Extend the generated request type, making workflowId required and others optional
// Exclude internal fields like auth headers and format options we don't expose
export type FetchDataOptions = Partial<
	Pick<
		WorkflowsApiV4WorkflowsWorkflowIdDataGetRequest,
		| "runId"
		| "sortBy"
		| "order"
		| "filters"
		| "page"
		| "limit"
		| "includeAnomalies"
	>
> & {
	workflowId: string;
};

export interface FetchDataResult extends PagedResponse<object> {
	workflowId: string;
	runId?: string | null;
	executedAt?: string | null;
}

/**
 * Query for fetching paginated workflow data
 */
export class FetchDataQuery {
	private readonly defaultLimit = 100;

	constructor(private readonly client: ApiProvider) {}

	/**
	 * Fetch a page of workflow data
	 *
	 * @param options Options for fetching data
	 * @returns Paginated workflow data
	 */
	async execute(options: FetchDataOptions): Promise<FetchDataResult> {
		try {
			const response = await this.client.workflows.v4WorkflowsWorkflowIdDataGet(
				{
					...options,
					page: options.page ?? 1,
					limit: options.limit ?? this.defaultLimit,
				},
			);

			const result = response.data;
			return result;
		} catch (error) {
			throw KadoaHttpException.wrap(error, {
				message: ERROR_MESSAGES.DATA_FETCH_FAILED,
				details: { workflowId: options.workflowId, page: options.page },
			});
		}
	}

	/**
	 * Internal method for iterator - executes a page fetch
	 */
	private async executePage(
		options: FetchDataOptions,
	): Promise<PagedResponse<object>> {
		const result = await this.execute(options);
		return result;
	}

	/**
	 * Fetch all pages of workflow data
	 *
	 * @param options Options for fetching data (page will be ignored)
	 * @returns All workflow data across all pages
	 */
	async fetchAll(options: FetchDataOptions): Promise<object[]> {
		// Create a custom iterator for this specific workflow
		const iterator = new PagedIterator((pageOptions) =>
			this.executePage({ ...options, ...pageOptions }),
		);

		return iterator.fetchAll({ limit: options.limit ?? this.defaultLimit });
	}

	/**
	 * Create an async iterator for paginated data fetching
	 *
	 * @param options Options for fetching data
	 * @returns Async iterator that yields pages of data
	 */
	async *pages(
		options: FetchDataOptions,
	): AsyncGenerator<FetchDataResult, void, unknown> {
		// Create a custom iterator for this specific workflow
		const iterator = new PagedIterator((pageOptions) =>
			this.execute({ ...options, ...pageOptions }),
		);

		for await (const page of iterator.pages({
			limit: options.limit ?? this.defaultLimit,
		})) {
			yield page as FetchDataResult;
		}
	}
}
