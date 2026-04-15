import { describe, expect, mock, test } from "bun:test";
import { ExtractionBuilderService } from "../../src/domains/extraction/services/extraction-builder.service";

describe("ExtractionBuilderService", () => {
  test("extract defaults to agentic-navigation with a schema-aware prompt", async () => {
    const create = mock(async (_input: Record<string, unknown>) => ({
      id: "wf-123",
    }));

    const service = new ExtractionBuilderService(
      {
        create,
      } as unknown as ConstructorParameters<typeof ExtractionBuilderService>[0],
      {
        resolveEntity: mock(async () => ({
          entity: "Product",
          fields: [{ name: "title" }],
        })),
      } as unknown as ConstructorParameters<typeof ExtractionBuilderService>[1],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[2],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[3],
    );

    const created = await service
      .extract({
        urls: ["https://example.com"],
        name: "Test Extraction",
        extraction: (builder) =>
          builder
            .entity("Product")
            .field("title", "Title", "STRING", { example: "Example Title" }),
      })
      .create();

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      urls: ["https://example.com"],
      navigationMode: "agentic-navigation",
      userPrompt:
        "extract all Product entities from this page and return these fields: title",
      entity: "Product",
    });
    expect(created.workflowId).toBe("wf-123");
  });

  test("extract uses the generic prompt when no schema is provided", async () => {
    const create = mock(async (_input: Record<string, unknown>) => ({
      id: "wf-234",
    }));

    const service = new ExtractionBuilderService(
      {
        create,
      } as unknown as ConstructorParameters<typeof ExtractionBuilderService>[0],
      {
        resolveEntity: mock(async () => ({
          entity: "Product",
          fields: [{ name: "title" }],
        })),
      } as unknown as ConstructorParameters<typeof ExtractionBuilderService>[1],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[2],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[3],
    );

    await service
      .extract({
        urls: ["https://example.com"],
        name: "Generic Extraction",
      })
      .create();

    expect(create.mock.calls[0]?.[0]).toMatchObject({
      navigationMode: "agentic-navigation",
      userPrompt: "extract all the data for the main entity of this page",
      fields: [],
    });
  });

  test("extract preserves an explicit user prompt", async () => {
    const create = mock(async (_input: Record<string, unknown>) => ({
      id: "wf-345",
    }));

    const service = new ExtractionBuilderService(
      {
        create,
      } as unknown as ConstructorParameters<typeof ExtractionBuilderService>[0],
      {
        resolveEntity: mock(async () => ({
          entity: "Product",
          fields: [{ name: "title" }],
        })),
      } as unknown as ConstructorParameters<typeof ExtractionBuilderService>[1],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[2],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[3],
    );

    await service
      .extract({
        urls: ["https://example.com"],
        name: "Prompt Override",
        extraction: (builder) =>
          builder
            .entity("Product")
            .field("title", "Title", "STRING", { example: "Example Title" }),
        userPrompt: "extract featured products only",
      })
      .create();

    expect(create.mock.calls[0]?.[0]).toMatchObject({
      navigationMode: "agentic-navigation",
      userPrompt: "extract featured products only",
    });
  });

  test("extract keeps raw helper fields on agentic navigation", async () => {
    const create = mock(async (_input: Record<string, unknown>) => ({
      id: "wf-456",
    }));

    const service = new ExtractionBuilderService(
      {
        create,
      } as unknown as ConstructorParameters<typeof ExtractionBuilderService>[0],
      {
        resolveEntity: mock(async () => ({
          entity: undefined,
          fields: [],
        })),
      } as unknown as ConstructorParameters<typeof ExtractionBuilderService>[1],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[2],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[3],
    );

    await service
      .extract({
        urls: ["https://example.com"],
        name: "Raw Extraction",
        extraction: (builder) => builder.raw("MARKDOWN"),
      })
      .create();

    expect(create.mock.calls[0]?.[0]).toMatchObject({
      navigationMode: "agentic-navigation",
      userPrompt:
        "extract all records from this page and return these fields: rawMarkdown",
    });
  });

  test("extract synthesizes raw helper fields as structured agentic fields", async () => {
    const create = mock(async (_input: Record<string, unknown>) => ({
      id: "wf-567",
    }));

    const service = new ExtractionBuilderService(
      {
        create,
      } as unknown as ConstructorParameters<typeof ExtractionBuilderService>[0],
      {
        resolveEntity: mock(async () => ({
          entity: undefined,
          fields: [],
        })),
      } as unknown as ConstructorParameters<typeof ExtractionBuilderService>[1],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[2],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[3],
    );

    await service
      .extract({
        urls: ["https://example.com"],
        name: "Raw Workflow",
        extraction: (builder) => builder.raw(["MARKDOWN", "PAGE_URL"]),
      })
      .create();

    expect(create.mock.calls[0]?.[0]).toMatchObject({
      navigationMode: "agentic-navigation",
      fields: [
        {
          name: "rawMarkdown",
          dataType: "STRING",
        },
        {
          name: "rawPageUrl",
          dataType: "LINK",
        },
      ],
      userPrompt:
        "extract all records from this page and return these fields: rawMarkdown, rawPageUrl",
    });
  });
});
