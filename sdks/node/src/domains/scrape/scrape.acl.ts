/**
 * Public scrape domain ACL.
 * Re-exports generated request/response types behind stable SDK names.
 */

import {
  ScrapeApi,
  type V4ScrapePost200Response,
  type V4ScrapePostRequest,
} from "../../generated";

export { ScrapeApi };
export type ScrapeRequest = V4ScrapePostRequest;
export type ScrapeResponse = V4ScrapePost200Response;
