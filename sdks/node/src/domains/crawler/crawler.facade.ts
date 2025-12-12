import type { KadoaClient } from "../../kadoa-client";
import { CrawlerConfigService } from "./crawler-config.service";
import { CrawlerSessionService } from "./crawler-session.service";

export interface CrawlerDomain {
  config: CrawlerConfigService;
  session: CrawlerSessionService;
}

export function createCrawlerDomain(client: KadoaClient): CrawlerDomain {
  return {
    config: new CrawlerConfigService(client),
    session: new CrawlerSessionService(client),
  };
}
