import type { KadoaClient } from "../../kadoa-client";
import {
  type CrawlerConfig,
  type CreateConfigRequest,
  type DeleteConfigResult,
} from "./crawler.acl";

export class CrawlerConfigService {
  constructor(private readonly client: KadoaClient) {}

  private get api() {
    return this.client.apis.crawler;
  }

  async createConfig(body: CreateConfigRequest): Promise<CrawlerConfig> {
    const response = await this.api.v4CrawlConfigPost({
      createCrawlerConfigRequest: body,
    });
    return response.data;
  }

  async getConfig(configId: string): Promise<CrawlerConfig> {
    const response = await this.api.v4CrawlConfigConfigIdGet({ configId });
    return response.data;
  }

  async deleteConfig(configId: string): Promise<DeleteConfigResult> {
    const response = await this.api.v4CrawlConfigDelete({
      deleteCrawlerConfigRequest: { configId },
    });
    return response.data;
  }
}
