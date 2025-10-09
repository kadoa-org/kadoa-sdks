import type {
  CrawlerApiInterface,
  NotificationsApiInterface,
  WorkflowsApiInterface,
  WorkspacesApiInterface,
} from "../../../generated";

/**
 * Interface for providing access to all API clients
 * This allows for dependency injection and easier testing
 */
export interface ApiProvider {
  /**
   * Workflows API for managing extraction workflows
   */
  readonly workflowsApi: WorkflowsApiInterface;

  /**
   * Crawl API for crawling operations
   */
  readonly crawlApi: CrawlerApiInterface;

  /**
   * Notifications API for managing notification channels and settings
   */
  readonly notificationsApi: NotificationsApiInterface;

  /**
   * Workspaces API for managing workspaces, users, teams, and organizations
   */
  readonly workspacesApi: WorkspacesApiInterface;
}
