import { describe, expect, mock, test } from "bun:test";
import type { SchemaField } from "../../src/domains/extraction";
import { ExtractionService } from "../../src/domains/extraction/services/extraction.service";

describe("ExtractionService", () => {
  test("run defaults to agentic-navigation without entity detection", async () => {
    const create = mock(async (_input: Record<string, unknown>) => ({
      id: "wf-123",
    }));
    const wait = mock(async () => ({
      runState: "FINISHED",
      state: "FINISHED",
    }));
    const fetchData = mock(async () => ({
      data: [{ title: "Example" }],
      pagination: { page: 1, totalPages: 1, totalCount: 1, limit: 100 },
    }));

    const workflowsCoreService = {
      create,
      wait,
    } as unknown as ConstructorParameters<typeof ExtractionService>[0];
    const dataFetcherService = {
      fetchData,
    } as unknown as ConstructorParameters<typeof ExtractionService>[1];
    const notificationSetupService = {
      setup: mock(async () => []),
    } as unknown as ConstructorParameters<typeof ExtractionService>[2];
    const notificationChannelsService = {} as ConstructorParameters<
      typeof ExtractionService
    >[3];
    const notificationSettingsService = {} as ConstructorParameters<
      typeof ExtractionService
    >[4];

    const service = new ExtractionService(
      workflowsCoreService,
      dataFetcherService,
      notificationSetupService,
      notificationChannelsService,
      notificationSettingsService,
    );

    const result = await service.run({
      urls: ["https://example.com"],
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      urls: ["https://example.com"],
      navigationMode: "agentic-navigation",
      userPrompt: "extract all the data for the main entity of this page",
      fields: [],
      autoStart: true,
    });
    expect(result.workflowId).toBe("wf-123");
    expect(fetchData).toHaveBeenCalledWith({ workflowId: "wf-123" });
  });

  test("run uses a schema-aware default prompt when entity and fields are provided", async () => {
    const create = mock(async (_input: Record<string, unknown>) => ({
      id: "wf-456",
    }));
    const wait = mock(async () => ({
      runState: "FINISHED",
      state: "FINISHED",
    }));
    const fetchData = mock(async () => ({
      data: [{ title: "Example" }],
      pagination: { page: 1, totalPages: 1, totalCount: 1, limit: 100 },
    }));

    const workflowsCoreService = {
      create,
      wait,
    } as unknown as ConstructorParameters<typeof ExtractionService>[0];
    const dataFetcherService = {
      fetchData,
    } as unknown as ConstructorParameters<typeof ExtractionService>[1];
    const notificationSetupService = {
      setup: mock(async () => []),
    } as unknown as ConstructorParameters<typeof ExtractionService>[2];
    const notificationChannelsService = {} as ConstructorParameters<
      typeof ExtractionService
    >[3];
    const notificationSettingsService = {} as ConstructorParameters<
      typeof ExtractionService
    >[4];

    const service = new ExtractionService(
      workflowsCoreService,
      dataFetcherService,
      notificationSetupService,
      notificationChannelsService,
      notificationSettingsService,
    );

    await service.run({
      urls: ["https://example.com"],
      entity: {
        name: "Product",
        fields: [
          { name: "title" } as unknown as SchemaField,
          { name: "price" } as unknown as SchemaField,
        ],
      },
    });

    expect(create.mock.calls[0]?.[0]).toMatchObject({
      navigationMode: "agentic-navigation",
      userPrompt:
        "extract all Product entities from this page and return these fields: title, price",
    });
  });

  test("run uses a records prompt when fields are provided without an entity name", async () => {
    const create = mock(async (_input: Record<string, unknown>) => ({
      id: "wf-567",
    }));
    const wait = mock(async () => ({
      runState: "FINISHED",
      state: "FINISHED",
    }));
    const fetchData = mock(async () => ({
      data: [{ title: "Example" }],
      pagination: { page: 1, totalPages: 1, totalCount: 1, limit: 100 },
    }));

    const service = new ExtractionService(
      { create, wait } as unknown as ConstructorParameters<
        typeof ExtractionService
      >[0],
      { fetchData } as unknown as ConstructorParameters<
        typeof ExtractionService
      >[1],
      { setup: mock(async () => []) } as unknown as ConstructorParameters<
        typeof ExtractionService
      >[2],
      {} as ConstructorParameters<typeof ExtractionService>[3],
      {} as ConstructorParameters<typeof ExtractionService>[4],
    );

    await service.run({
      urls: ["https://example.com"],
      entity: {
        fields: [{ name: "title" } as unknown as SchemaField],
      },
    });

    expect(create.mock.calls[0]?.[0]).toMatchObject({
      userPrompt:
        "extract all records from this page and return these fields: title",
    });
  });

  test("submit uses agentic defaults without waiting", async () => {
    const create = mock(async (_input: Record<string, unknown>) => ({
      id: "wf-submit",
    }));

    const service = new ExtractionService(
      { create } as unknown as ConstructorParameters<
        typeof ExtractionService
      >[0],
      { setup: mock(async () => []) } as unknown as ConstructorParameters<
        typeof ExtractionService
      >[1],
      {} as ConstructorParameters<typeof ExtractionService>[2],
      {} as ConstructorParameters<typeof ExtractionService>[3],
    );

    const result = await service.submit({
      urls: ["https://example.com"],
    });

    expect(result).toEqual({ workflowId: "wf-submit" });
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      navigationMode: "agentic-navigation",
      userPrompt: "extract all the data for the main entity of this page",
    });
  });

  test("submit preserves an explicit user prompt", async () => {
    const create = mock(async (_input: Record<string, unknown>) => ({
      id: "wf-submit-override",
    }));

    const service = new ExtractionService(
      { create } as unknown as ConstructorParameters<
        typeof ExtractionService
      >[0],
      { setup: mock(async () => []) } as unknown as ConstructorParameters<
        typeof ExtractionService
      >[1],
      {} as ConstructorParameters<typeof ExtractionService>[2],
      {} as ConstructorParameters<typeof ExtractionService>[3],
    );

    await service.submit({
      urls: ["https://example.com"],
      userPrompt: "extract only in-stock items",
    });

    expect(create.mock.calls[0]?.[0]).toMatchObject({
      userPrompt: "extract only in-stock items",
    });
  });
});
