import type { KadoaClient } from "../../kadoa-client";
import {
  CrawlerApi,
  type CrawlerConfig,
  type CreateConfigRequest,
  type DeleteConfigResult,
} from "./crawler.acl";

export class CrawlerConfigService {
  private _api: CrawlerApi | null = null;

  constructor(private readonly client: KadoaClient) {}

  private get api(): CrawlerApi {
    if (!this._api) {
      this._api = new CrawlerApi(
        this.client.configuration,
        this.client.baseUrl,
        this.client.axiosInstance,
      );
    }
    return this._api;
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
