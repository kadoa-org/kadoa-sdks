import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient, KadoaHttpException } from "../../src";
import type {
  CreatedExtraction,
  WaitForReadyOptions,
} from "../../src/domains/extraction/services/extraction-builder.service";
import { getE2ETestEnv } from "../utils/env";

type IntervalValidationError = {
  validationErrors?: {
    interval?: unknown;
  };
};

const hasRealTimeIntervalError = (payload: unknown): boolean => {
  if (!payload || typeof payload !== "object") return false;
  const candidate = (payload as IntervalValidationError).validationErrors
    ?.interval;
  return typeof candidate === "string" && candidate.includes("REAL_TIME");
};

const toWorkflowId = (event: unknown): string | undefined => {
  if (!event || typeof event !== "object") return undefined;

  const record = event as Record<string, unknown>;
  if (typeof record.workflowId === "string") return record.workflowId;

  const fromNested = (key: "data" | "payload") => {
    const nested = record[key];
    if (!nested || typeof nested !== "object") return undefined;
    const nestedWorkflowId = (nested as Record<string, unknown>).workflowId;
    return typeof nestedWorkflowId === "string" ? nestedWorkflowId : undefined;
  };

  return fromNested("data") ?? fromNested("payload");
};

const env = getE2ETestEnv();
const isTeamKey = env.KADOA_API_KEY.startsWith("tk-");

describe("Realtime extraction lifecycle", () => {
  let client: KadoaClient | undefined;
  let unsubscribe: (() => void) | undefined;

  beforeAll(() => {
    if (!isTeamKey) return;

    client = new KadoaClient({
      apiKey: env.KADOA_API_KEY,
      timeout: 30000,
      enableRealtime: true,
    });
  });

  afterAll(async () => {
    if (!isTeamKey) return;

    unsubscribe?.();
    if (client) {
      try {
        client.dispose();
      } finally {
        client = undefined;
      }
    }
  });

  test(
    "creates a realtime workflow and waits for preview",
    async () => {
      if (!isTeamKey) {
        console.warn(
          "Skipping realtime extraction e2e test: requires a team API key with realtime monitoring enabled.",
        );
        return;
      }

      if (!client) {
        throw new Error("Client not initialised");
      }

      const waitOptions: WaitForReadyOptions = {
        pollIntervalMs: 5000,
        timeoutMs: 5 * 60 * 1000,
      };

      const urls = [
        "https://sandbox.kadoa.com/financial",
        "https://sandbox.kadoa.com/change-detection",
      ];

      let created: CreatedExtraction | undefined;
      let schemaType: "financial" | "changeDetection" | undefined;

      for (const url of urls) {
        const extraction = client
          .extract({
            urls: [url],
            name: `Realtime SDK Test ${Date.now()}`,
            extraction: (schema) => {
              if (url.includes("financial")) {
                schemaType = "financial";
                return schema
                  .entity("FinancialReport")
                  .field(
                    "title",
                    "The title of the financial report.",
                    "STRING",
                    {
                      example: "Q2 Report",
                      isKey: true,
                    },
                  )
                  .field(
                    "postedDate",
                    "The date the financial report was posted.",
                    "DATE",
                    { example: "2024-05-15", isKey: true },
                  )
                  .field(
                    "link",
                    "The link to view the financial report.",
                    "LINK",
                    { example: "https://dummy.com/q2" },
                  );
              }

              schemaType = "changeDetection";
              return schema
                .entity("MarketChange")
                .field("title", "Title of the item", "STRING", {
                  example: "Market Analysis Report",
                  isKey: true,
                })
                .field("date", "Date associated with the item", "STRING", {
                  example: "Date: 2024-01-15",
                })
                .field("link", "URL linking to the item details", "LINK", {
                  example: "https://example.com/market-analysis-jan-2024",
                })
                .field(
                  "text",
                  "Brief description or content of the item",
                  "STRING",
                  {
                    example:
                      "Comprehensive analysis of global commodity markets",
                  },
                );
            },
          })
          .setInterval({ interval: "REAL_TIME" });

        try {
          created = await extraction.create();
          break;
        } catch (error) {
          if (
            error instanceof KadoaHttpException &&
            error.httpStatus === 400 &&
            hasRealTimeIntervalError(error.responseBody)
          ) {
            console.warn(
              "Skipping realtime extraction e2e test: interval REAL_TIME is not enabled for this team.",
            );
            return;
          }

          if (
            error instanceof KadoaHttpException &&
            (error.code === "NETWORK_ERROR" || error.code === "HTTP_ERROR")
          ) {
            console.warn(
              "Skipping realtime extraction e2e test: network access to the public API is required.",
            );
            return;
          }

          // Try next URL if available
          if (url === urls[0]) {
            continue;
          }

          throw error;
        }
      }

      if (!created) {
        throw new Error(
          "Failed to create realtime workflow for both scenarios",
        );
      }

      console.log("Realtime schema used:", schemaType);

      expect(created.workflowId).toBeTruthy();

      unsubscribe = client.realtime?.onEvent((event) => {
        const workflowId = created.workflowId;
        const candidate = toWorkflowId(event);

        if (candidate === workflowId) {
          console.debug("Realtime event received for workflow %s", workflowId);
        }
      });

      const workflow = await created.waitForReady(waitOptions);
      expect(["PREVIEW", "ACTIVE"]).toContain(workflow.state);

      // await client.workflow.delete(created.workflowId);
    },
    { timeout: 6 * 60 * 1000 },
  );
});
