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

    test("allows agentic-navigation when userPrompt is passed directly to extract()", async () => {
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
        userPrompt: "Extract all products",
      });

      // Should not throw validation error
      await expect(prepared.create()).resolves.toBeDefined();
    });
  });

  describe("Parameter Destructuring", () => {
    test("correctly destructures userPrompt when passed to extract()", () => {
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
        userPrompt: "Test prompt",
      });

      // Verify userPrompt is set in options
      expect(prepared.options.userPrompt).toBe("Test prompt");
    });

    test("correctly destructures interval when passed to extract()", () => {
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
        interval: "ONLY_ONCE",
      });

      // Verify interval is set in options
      expect(prepared.options.interval).toBe("ONLY_ONCE");
    });

    test("correctly destructures schedules when passed to extract()", () => {
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
        schedules: ["0 0 * * *"],
      });

      // Verify schedules is set in options
      expect(prepared.options.schedules).toEqual(["0 0 * * *"]);
    });

    test("correctly destructures location when passed to extract()", () => {
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

      const locationConfig = { type: "auto" as const };
      const prepared = builder.extract({
        urls: ["https://example.com"],
        name: "Test",
        location: locationConfig,
      });

      // Verify location is set in options
      expect(prepared.options.location).toEqual(locationConfig);
    });

    test("correctly destructures all parameters together when passed to extract()", () => {
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

      const locationConfig = { type: "auto" as const };
      const prepared = builder.extract({
        urls: ["https://example.com"],
        name: "Test",
        userPrompt: "Test prompt",
        interval: "ONLY_ONCE",
        schedules: ["0 0 * * *"],
        location: locationConfig,
      });

      // Verify all parameters are set in options
      expect(prepared.options.userPrompt).toBe("Test prompt");
      expect(prepared.options.interval).toBe("ONLY_ONCE");
      expect(prepared.options.schedules).toEqual(["0 0 * * *"]);
      expect(prepared.options.location).toEqual(locationConfig);
    });
  });
});
