import type {
	CrawlApiInterface,
	WorkflowsApiInterface,
} from "../../../generated";

/**
 * Interface for providing access to all API clients
 * This allows for dependency injection and easier testing
 */
export interface ApiProvider {
	/**
	 * Workflows API for managing extraction workflows
	 */
	readonly workflows: WorkflowsApiInterface;

	/**
	 * Crawl API for crawling operations
	 */
	readonly crawl: CrawlApiInterface;
}
