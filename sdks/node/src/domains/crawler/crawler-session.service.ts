import type { KadoaClient } from "../../kadoa-client";
import {
  CrawlerApi,
  type CrawlerSession,
  type GetAllDataOptions,
  type GetPageOptions,
  type GetPagesOptions,
  type ListSessionsOptions,
  type PageContent,
  type SessionDataList,
  type SessionOperationResult,
  type SessionPagesResult,
  type SessionStatus,
  type StartCrawlRequest,
  type StartSessionResult,
  type StartWithConfigRequest,
} from "./crawler.acl";

export class CrawlerSessionService {
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

  async start(body: StartCrawlRequest): Promise<StartSessionResult> {
    const response = await this.api.v4CrawlPost({
      startCrawlerSessionRequest: body,
    });
    return response.data;
  }

  async startWithConfig(
    body: StartWithConfigRequest,
  ): Promise<StartSessionResult> {
    const response = await this.api.v4CrawlStartPost({
      startSessionWithConfigRequest: body,
    });
    return response.data;
  }

  async pause(sessionId: string): Promise<SessionOperationResult> {
    const response = await this.api.v4CrawlPausePost({
      pauseCrawlerSessionRequest: { sessionId },
    });
    return response.data;
  }

  async resume(sessionId: string): Promise<SessionOperationResult> {
    const response = await this.api.v4CrawlResumePost({
      resumeCrawlerSessionRequest: { sessionId },
    });
    return response.data;
  }

  async listSessions(options?: ListSessionsOptions): Promise<CrawlerSession[]> {
    const response = await this.api.v4CrawlSessionsGet({
      page: options?.page,
      pageSize: options?.pageSize,
      userId: options?.userId,
    });
    return response.data.data ?? [];
  }

  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    const response = await this.api.v4CrawlSessionIdStatusGet({ sessionId });
    return response.data;
  }

  async getPages(
    sessionId: string,
    options?: GetPagesOptions,
  ): Promise<SessionPagesResult> {
    const response = await this.api.v4CrawlSessionIdPagesGet({
      sessionId,
      currentPage: options?.currentPage,
      pageSize: options?.pageSize,
    });
    return response.data;
  }

  async getPage(
    sessionId: string,
    pageId: string,
    options?: GetPageOptions,
  ): Promise<PageContent> {
    const response = await this.api.v4CrawlSessionIdPagesPageIdGet({
      sessionId,
      pageId,
      format: options?.format,
    });
    return response.data;
  }

  async getAllSessionData(
    sessionId: string,
    options?: GetAllDataOptions,
  ): Promise<SessionDataList> {
    const response = await this.api.v4CrawlSessionIdListGet({
      sessionId,
      includeAll: options?.includeAll,
    });
    return response.data;
  }

  async getBucketFile(filenameb64: string): Promise<unknown> {
    const response = await this.api.v4CrawlBucketDataFilenameb64Get({
      filenameb64,
    });
    return response.data;
  }
}
