import { CrawlApi, WorkflowsApi } from "./generated";
import type { KadoaSDK } from "./kadoa-sdk";

const crawlApiCache = new WeakMap<KadoaSDK, CrawlApi>();
const workflowsApiCache = new WeakMap<KadoaSDK, WorkflowsApi>();

export function getCrawlApi(sdk: KadoaSDK): CrawlApi {
	let api = crawlApiCache.get(sdk);

	if (!api) {
		api = new CrawlApi(sdk.configuration, sdk.baseUrl, sdk.axiosInstance);
		crawlApiCache.set(sdk, api);
	}

	return api;
}

export function getWorkflowsApi(sdk: KadoaSDK): WorkflowsApi {
	let api = workflowsApiCache.get(sdk);

	if (!api) {
		api = new WorkflowsApi(sdk.configuration, sdk.baseUrl, sdk.axiosInstance);
		workflowsApiCache.set(sdk, api);
	}

	return api;
}
