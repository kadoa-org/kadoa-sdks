import { KadoaHttpException } from "../../../core/exceptions";
import { ERROR_MESSAGES } from "../../../core/exceptions/base.exception";
import { getWorkflowsApi } from "../../../core/http";
import type { KadoaClient } from "../../../kadoa-client";

/**
 * Service for fetching extracted data from workflows
 */
export class DataFetcherService {
	constructor(private readonly client: KadoaClient) {}

	/**
	 * Fetch extracted data from a workflow
	 *
	 * @param workflowId The workflow ID to fetch data from
	 * @param limit Maximum number of records to retrieve
	 * @returns Array of extracted data objects
	 */
	async fetchWorkflowData(
		workflowId: string,
		limit: number,
	): Promise<Array<object>> {
		const workflowsApi = getWorkflowsApi(this.client);

		try {
			const response = await workflowsApi.v4WorkflowsWorkflowIdDataGet({
				workflowId,
				limit,
			});
			return response.data.data ?? [];
		} catch (error) {
			throw KadoaHttpException.wrap(error, {
				message: ERROR_MESSAGES.DATA_FETCH_FAILED,
				details: { workflowId, limit },
			});
		}
	}
}
