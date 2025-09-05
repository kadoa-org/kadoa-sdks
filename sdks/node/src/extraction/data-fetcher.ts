import { getWorkflowsApi } from "../api-client";
import { wrapKadoaError } from "../exceptions/utils";
import type { KadoaSDK } from "../kadoa-sdk";
import { DEFAULT_OPTIONS, ERROR_MESSAGES } from "./constants";

/**
 * Fetch extracted data from a workflow
 *
 * @param sdkInstance The Kadoa SDK instance
 * @param workflowId The workflow ID to fetch data from
 * @param limit Maximum number of records to retrieve
 * @returns Array of extracted data objects
 */
export async function fetchWorkflowData(
	sdkInstance: KadoaSDK,
	workflowId: string,
	limit = DEFAULT_OPTIONS.dataLimit,
): Promise<Array<object>> {
	const workflowsApi = getWorkflowsApi(sdkInstance);

	try {
		const response = await workflowsApi.v4WorkflowsWorkflowIdDataGet({
			workflowId,
			limit,
		});
		return response.data.data ?? [];
	} catch (error) {
		throw wrapKadoaError(error, {
			message: ERROR_MESSAGES.DATA_FETCH_FAILED,
			details: { workflowId, limit },
		});
	}
}
