import type {
	V4WorkflowsWorkflowIdDataGet200Response,
	V4WorkflowsWorkflowIdDataGet200ResponsePagination,
	V4WorkflowsWorkflowIdDataGetOrderEnum,
	WorkflowsApiV4WorkflowsWorkflowIdDataGetRequest,
} from "../../../../generated";
import { KadoaHttpException } from "../../../runtime/exceptions";
import { ERROR_MESSAGES } from "../../../runtime/exceptions/base.exception";
import { PagedIterator, type PagedResponse } from "../../../runtime/pagination";
import type { KadoaClient } from "../../../../kadoa-client";

export type DataPagination = V4WorkflowsWorkflowIdDataGet200ResponsePagination;
export type WorkflowDataResponse = V4WorkflowsWorkflowIdDataGet200Response;
export type DataSortOrder = V4WorkflowsWorkflowIdDataGetOrderEnum;

export interface FetchDataResult extends PagedResponse<object> {
	workflowId: string;
	runId?: string | null;
	executedAt?: string | null;
}

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

/**
 * Service for fetching workflow data with pagination support
 */
export class DataFetcherService {
	private readonly defaultLimit = 100;

	constructor(private readonly client: KadoaClient) {}

	/**
	 * Fetch a page of workflow data
	 */
	async fetchData(options: FetchDataOptions): Promise<FetchDataResult> {
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
