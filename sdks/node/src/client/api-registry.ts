import type { AxiosInstance } from "axios";
import { CrawlerApi } from "../domains/crawler/crawler.acl";
import {
  type BaseAPI,
  Configuration,
  DataValidationApi,
  NotificationsApi,
  SchemasApi,
  WorkflowsApi,
} from "./apis.acl";

type ApiConstructor<T extends BaseAPI> = new (
  configuration: Configuration,
  basePath: string,
  axios: AxiosInstance,
) => T;

export class ApiRegistry {
  private readonly configuration: Configuration;
  private readonly cache = new Map<ApiConstructor<BaseAPI>, BaseAPI>();

  constructor(
    apiKey: string,
    private readonly baseUrl: string,
    private readonly axios: AxiosInstance,
    headers: Record<string, string>,
  ) {
    this.configuration = new Configuration({
      apiKey,
      basePath: baseUrl,
      baseOptions: { headers },
    });
  }

  private get<T extends BaseAPI>(ApiClass: ApiConstructor<T>): T {
    if (!this.cache.has(ApiClass)) {
      this.cache.set(
        ApiClass,
        new ApiClass(this.configuration, this.baseUrl, this.axios),
      );
    }
    return this.cache.get(ApiClass) as T;
  }

  get schemas(): SchemasApi {
    return this.get(SchemasApi);
  }

  get validation(): DataValidationApi {
    return this.get(DataValidationApi);
  }

  get crawler(): CrawlerApi {
    return this.get(CrawlerApi);
  }

  get workflows(): WorkflowsApi {
    return this.get(WorkflowsApi);
  }

  get notifications(): NotificationsApi {
    return this.get(NotificationsApi);
  }
}
