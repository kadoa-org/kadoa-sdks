import { CrawlApi, WorkflowsApi } from "../../generated";
import type { KadoaClient } from "../../kadoa-client";

const crawlApiCache = new WeakMap<KadoaClient, CrawlApi>();
const workflowsApiCache = new WeakMap<KadoaClient, WorkflowsApi>();

export function getCrawlApi(client: KadoaClient): CrawlApi {
	let api = crawlApiCache.get(client);

	if (!api) {
		api = new CrawlApi(
			client.configuration,
			client.baseUrl,
			client.axiosInstance,
		);
		crawlApiCache.set(client, api);
	}

	return api;
}

export function getWorkflowsApi(client: KadoaClient): WorkflowsApi {
	let api = workflowsApiCache.get(client);

	if (!api) {
		api = new WorkflowsApi(
			client.configuration,
			client.baseUrl,
			client.axiosInstance,
		);
		workflowsApiCache.set(client, api);
	}

	return api;
}
