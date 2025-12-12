import { afterAll, describe, expect, it } from "bun:test";
import { KadoaClient } from "../../src/kadoa-client";
import { getTestEnv } from "../utils/env";

describe("Crawler Session E2E", () => {
  const env = getTestEnv();
  const client = new KadoaClient({ apiKey: env.KADOA_API_KEY });
  const createdSessionIds: string[] = [];

  afterAll(async () => {
    for (const sessionId of createdSessionIds) {
      try {
        await client.crawler.session.pause(sessionId);
      } catch {
        // ignore cleanup errors
      }
    }
  });

  it("should start a crawler session", async () => {
    const session = await client.crawler.session.start({
      url: "https://sandbox.kadoa.com/careers",
      maxDepth: 2,
      maxPages: 5,
    });

    expect(session).toBeDefined();
    expect(session.sessionId).toBeDefined();

    createdSessionIds.push(session.sessionId);
  });

  it("should list crawler sessions", async () => {
    const sessions = await client.crawler.session.listSessions();

    expect(sessions).toBeDefined();
    expect(Array.isArray(sessions)).toBe(true);
  });

  it("should get session status", async () => {
    const session = await client.crawler.session.start({
      url: "https://sandbox.kadoa.com/careers",
      maxDepth: 1,
      maxPages: 3,
    });
    createdSessionIds.push(session.sessionId);

    // wait for session to be registered
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const status = await client.crawler.session.getSessionStatus(
      session.sessionId,
    );

    expect(status).toBeDefined();
    expect(status.sessionId).toBe(session.sessionId);
  });

  it("should get session pages", async () => {
    const session = await client.crawler.session.start({
      url: "https://sandbox.kadoa.com/careers",
      maxDepth: 1,
      maxPages: 3,
    });
    createdSessionIds.push(session.sessionId);

    // wait for crawl to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const pages = await client.crawler.session.getPages(session.sessionId);

    expect(pages).toBeDefined();
    expect(pages.payload).toBeDefined();
  });

  it("should pause and resume session", async () => {
    const session = await client.crawler.session.start({
      url: "https://sandbox.kadoa.com/careers",
      maxDepth: 2,
      maxPages: 10,
    });
    createdSessionIds.push(session.sessionId);

    const pauseResult = await client.crawler.session.pause(session.sessionId);
    expect(pauseResult).toBeDefined();

    const resumeResult = await client.crawler.session.resume(session.sessionId);
    expect(resumeResult).toBeDefined();
  });
});
