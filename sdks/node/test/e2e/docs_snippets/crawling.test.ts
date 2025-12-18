/**
 * TS-CRAWL: crawling.mdx snippets
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { KadoaClient } from "../../../src/kadoa-client";
import { getTestEnv } from "../../utils/env";

describe("TS-CRAWL: crawling.mdx snippets", () => {
  let client: KadoaClient;
  const createdSessionIds: string[] = [];

  beforeAll(() => {
    client = new KadoaClient({ apiKey: getTestEnv().KADOA_API_KEY });
  });

  afterAll(async () => {
    for (const sessionId of createdSessionIds) {
      try {
        await client.crawler.session.pause(sessionId);
      } catch {
        // ignore cleanup errors
      }
    }
    client.dispose?.();
  });

  it(
    "TS-CRAWL-001: Start a crawl with single URL",
    async () => {
      // @docs-preamble TS-CRAWL-001
      // import { KadoaClient } from '@kadoa/node-sdk';
      //
      // const client = new KadoaClient({ apiKey: 'YOUR_API_KEY' });
      // @docs-preamble-end TS-CRAWL-001
      // @docs-start TS-CRAWL-001
      const result = await client.crawler.session.start({
        url: "https://demo.vercel.store/",
        maxDepth: 10,
        maxPages: 50,
      });

      console.log(result.sessionId);
      // @docs-end TS-CRAWL-001

      expect(result).toBeDefined();
      expect(result.sessionId).toBeDefined();
      createdSessionIds.push(result.sessionId);
    },
    { timeout: 60000 },
  );

  it(
    "TS-CRAWL-002: Start a crawl with multiple URLs",
    async () => {
      // @docs-start TS-CRAWL-002
      const result = await client.crawler.session.start({
        startUrls: [
          "https://demo.vercel.store/",
          "https://demo.vercel.store/collections",
          "https://demo.vercel.store/about",
        ],
        maxDepth: 10,
        maxPages: 50,
      });
      // @docs-end TS-CRAWL-002

      expect(result).toBeDefined();
      expect(result.sessionId).toBeDefined();
      createdSessionIds.push(result.sessionId);
    },
    { timeout: 60000 },
  );

  it(
    "TS-CRAWL-003: Check crawl status",
    async () => {
      // First create a session
      const session = await client.crawler.session.start({
        url: "https://sandbox.kadoa.com/careers",
        maxDepth: 1,
        maxPages: 3,
      });
      createdSessionIds.push(session.sessionId);

      // Wait for session to be registered
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const sessionId = session.sessionId;
      // @docs-start TS-CRAWL-003
      const status = await client.crawler.session.getSessionStatus(sessionId);

      console.log(status.payload.crawledPages);
      console.log(status.payload.finished);
      // @docs-end TS-CRAWL-003

      expect(status).toBeDefined();
      expect(status.sessionId).toBe(session.sessionId);
    },
    { timeout: 60000 },
  );

  it(
    "TS-CRAWL-004: List crawled pages",
    async () => {
      // First create a session
      const session = await client.crawler.session.start({
        url: "https://sandbox.kadoa.com/careers",
        maxDepth: 1,
        maxPages: 3,
      });
      createdSessionIds.push(session.sessionId);

      // Wait for crawl to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const sessionId = session.sessionId;
      // @docs-start TS-CRAWL-004
      const pages = await client.crawler.session.getPages(sessionId, {
        currentPage: 1,
        pageSize: 100,
      });

      for (const page of pages.payload) {
        console.log(page.id, page.url, page.status);
      }
      // @docs-end TS-CRAWL-004

      expect(pages).toBeDefined();
      expect(pages.payload).toBeDefined();
    },
    { timeout: 60000 },
  );

  it.skip(
    "TS-CRAWL-005: Retrieve page content",
    async () => {
      // This test requires a completed crawl with pages
      const sessionId = "YOUR_SESSION_ID";
      const pageId = "YOUR_PAGE_ID";
      // @docs-start TS-CRAWL-005
      // Get as markdown
      const markdown = await client.crawler.session.getPage(sessionId, pageId, {
        format: "markdown",
      });

      console.log(markdown.payload);

      // Get as HTML
      const html = await client.crawler.session.getPage(sessionId, pageId, {
        format: "html",
      });
      // @docs-end TS-CRAWL-005

      expect(markdown).toBeDefined();
      expect(html).toBeDefined();
    },
    { timeout: 60000 },
  );
});
