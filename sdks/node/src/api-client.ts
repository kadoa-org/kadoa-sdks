import { CrawlApi, WorkflowsApi } from "./generated";
import type { KadoaSDK } from "./kadoa-sdk";

const crawlApiCache = new WeakMap<KadoaSDK, CrawlApi>();
const workflowsApiCache = new WeakMap<KadoaSDK, WorkflowsApi>();

export function getCrawlApi(app: KadoaSDK): CrawlApi {
	let api = crawlApiCache.get(app);

	if (!api) {
		api = new CrawlApi(app.configuration, app.baseUrl, app.axiosInstance);
		crawlApiCache.set(app, api);
	}

	return api;
}

export function getWorkflowsApi(app: KadoaSDK): WorkflowsApi {
	let api = workflowsApiCache.get(app);

	if (!api) {
		api = new WorkflowsApi(app.configuration, app.baseUrl, app.axiosInstance);
		workflowsApiCache.set(app, api);
	}

	return api;
}
