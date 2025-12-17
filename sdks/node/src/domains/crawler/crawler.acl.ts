/**
 * Crawler Domain ACL
 *
 * Wraps generated crawler API types for SDK consumers.
 * Prevents generated type leakage into public API.
 */

// ============================================================================
// IMPORTS
// ============================================================================

import {
  // API Client
  CrawlerApi,
  type CrawlerSessionItem,
  // Nested config types
  type CreateCrawlerConfigRequestArtifactOptions,
  type CreateCrawlerConfigRequestBlueprintInner,
  type CreateCrawlerConfigRequestCrawlMethod,
  type CreateCrawlerConfigRequestExtractionOptions,
  type CreateCrawlerConfigRequestNavigationOptions,
  // Response types
  type CreateCrawlerConfigResponse,
  type DeleteCrawlerConfigResponse,
  // Request types
  type CreateCrawlerConfigRequest as GeneratedCreateConfigRequest,
  type DeleteCrawlerConfigRequest as GeneratedDeleteConfigRequest,
  type StartCrawlerSessionRequest as GeneratedStartCrawlRequest,
  type StartSessionWithConfigRequest as GeneratedStartWithConfigRequest,
  type GetCrawlerConfigResponse,
  type GetCrawlerSessionDataListResponse,
  type GetCrawlerSessionDataListResponseDataInner,
  type GetCrawlerSessionPageResponse,
  type GetCrawlerSessionPagesResponse,
  type GetCrawlerSessionPagesResponsePagination,
  type GetCrawlerSessionPagesResponsePayloadInner,
  type GetCrawlerSessionStatusResponse,
  type ListCrawlerSessionsResponse,
  type PauseCrawlerSessionResponse,
  type ResumeCrawlerSessionResponse,
  type StartCrawlerSessionResponse,
} from "../../generated";

// ============================================================================
// API CLIENT
// ============================================================================

export { CrawlerApi };
export type CrawlerApiInterface = InstanceType<typeof CrawlerApi>;

// ============================================================================
// ENUMS
// ============================================================================

export const PageStatus = {
  Done: "DONE",
  Crawling: "CRAWLING",
  Pending: "PENDING",
} as const;

export type PageStatus = (typeof PageStatus)[keyof typeof PageStatus];

// ============================================================================
// CONFIG REQUEST TYPES
// ============================================================================

export type CreateConfigRequest = GeneratedCreateConfigRequest;
export type DeleteConfigRequest = GeneratedDeleteConfigRequest;

// Nested config options (re-export with cleaner names)
export type ArtifactOptions = CreateCrawlerConfigRequestArtifactOptions;
export type BlueprintItem = CreateCrawlerConfigRequestBlueprintInner;
export type CrawlMethod = CreateCrawlerConfigRequestCrawlMethod;
export type CrawlerExtractionOptions =
  CreateCrawlerConfigRequestExtractionOptions;
export type NavigationOptions = CreateCrawlerConfigRequestNavigationOptions;

// ============================================================================
// SESSION REQUEST TYPES
// ============================================================================

export type StartCrawlRequest = GeneratedStartCrawlRequest;
export type StartWithConfigRequest = GeneratedStartWithConfigRequest;

// ============================================================================
// CONFIG RESPONSE TYPES
// ============================================================================

// Unify create/get config responses (same shape)
export type CrawlerConfig =
  | CreateCrawlerConfigResponse
  | GetCrawlerConfigResponse;
export type DeleteConfigResult = DeleteCrawlerConfigResponse;

// ============================================================================
// SESSION RESPONSE TYPES
// ============================================================================

export type StartSessionResult = StartCrawlerSessionResponse;
export type SessionOperationResult =
  | PauseCrawlerSessionResponse
  | ResumeCrawlerSessionResponse;
export type SessionStatus = GetCrawlerSessionStatusResponse;

// Session list types
export type CrawlerSession = CrawlerSessionItem;
export type ListSessionsResult = ListCrawlerSessionsResponse;

// Pages types
export type SessionPage = GetCrawlerSessionPagesResponsePayloadInner;
export type PaginationInfo = GetCrawlerSessionPagesResponsePagination;
export type SessionPagesResult = GetCrawlerSessionPagesResponse;
export type PageContent = GetCrawlerSessionPageResponse;

// Session data types
export type SessionDataItem = GetCrawlerSessionDataListResponseDataInner;
export type SessionDataList = GetCrawlerSessionDataListResponse;

// ============================================================================
// SERVICE REQUEST OPTIONS
// ============================================================================

export interface ListSessionsOptions {
  page?: number;
  pageSize?: number;
  userId?: string;
}

export interface GetPagesOptions {
  currentPage?: number;
  pageSize?: number;
}

export interface GetPageOptions {
  format?: "html" | "markdown";
}

export interface GetAllDataOptions {
  includeAll?: boolean;
}

export interface GetBucketFileOptions {
  contentType?: string;
  cacheControl?: string;
}
