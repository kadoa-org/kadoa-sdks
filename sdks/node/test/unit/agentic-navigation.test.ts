import { describe, expect, test } from "bun:test";
import { DataFetcherService } from "../../src/domains/extraction/services/data-fetcher.service";
import { EntityResolverService } from "../../src/domains/extraction/services/entity-resolver.service";
import { ExtractionBuilderService } from "../../src/domains/extraction/services/extraction-builder.service";
import { NotificationSetupService } from "../../src/domains/notifications/notification-setup.service";
import { WorkflowsCoreService } from "../../src/domains/workflows/workflows-core.service";
import type { KadoaClient } from "../../src/kadoa-client";

describe("Agentic Navigation", () => {
  describe("Validation", () => {
    test("throws error when userPrompt is missing for agentic-navigation", async () => {
      const mockClient = {} as KadoaClient;
      const entityResolver = new EntityResolverService(mockClient);
      const dataFetcher = new DataFetcherService(mockClient);
      const notificationSetup = new NotificationSetupService(mockClient);
      const workflowsCore = new WorkflowsCoreService({
        v4WorkflowsPost: async () => ({
          data: { workflowId: "test-id" },
        }),
      } as any);

      const builder = new ExtractionBuilderService(
        workflowsCore,
        entityResolver,
        dataFetcher,
        notificationSetup,
      );

      const prepared = builder.extract({
        urls: ["https://example.com"],
        name: "Test",
        navigationMode: "agentic-navigation",
      });

      await expect(prepared.create()).rejects.toThrow(
        "userPrompt is required when navigationMode is 'agentic-navigation'",
      );
    });

    test("allows agentic-navigation when userPrompt is provided", async () => {
      const mockClient = {} as KadoaClient;
      const entityResolver = new EntityResolverService(mockClient);
      const dataFetcher = new DataFetcherService(mockClient);
      const notificationSetup = new NotificationSetupService(mockClient);
      const workflowsCore = new WorkflowsCoreService({
        v4WorkflowsPost: async () => ({
          data: { workflowId: "test-id" },
        }),
      } as any);

      const builder = new ExtractionBuilderService(
        workflowsCore,
        entityResolver,
        dataFetcher,
        notificationSetup,
      );

      const prepared = builder
        .extract({
          urls: ["https://example.com"],
          name: "Test",
          navigationMode: "agentic-navigation",
        })
        .withPrompt("Extract all products");

      // Should not throw validation error
      await expect(prepared.create()).resolves.toBeDefined();
    });
  });
});
