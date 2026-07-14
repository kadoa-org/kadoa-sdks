import type { KadoaClient } from "../../kadoa-client";
import type { ScrapeRequest, ScrapeResponse } from "./scrape.acl";

/** Fetch one URL through Kadoa's smart scrape routing. */
export class ScrapeService {
  constructor(private readonly client: KadoaClient) {}

  async fetch(request: ScrapeRequest): Promise<ScrapeResponse> {
    const response = await this.client.apis.scrape.v4ScrapePost({
      v4ScrapePostRequest: request,
    });
    return response.data;
  }
}
