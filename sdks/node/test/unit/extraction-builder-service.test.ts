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
      {} as ConstructorParameters<typeof ExtractionBuilderService>[1],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[2],
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
      {} as ConstructorParameters<typeof ExtractionBuilderService>[1],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[2],
    );

    await service
      .extract({
        urls: ["https://example.com"],
        name: "Generic Extraction",
      })
      .create();

    expect(create.mock.calls[0]?.[0]).toMatchObject({
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
      {} as ConstructorParameters<typeof ExtractionBuilderService>[1],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[2],
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
      {} as ConstructorParameters<typeof ExtractionBuilderService>[1],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[2],
    );

    await service
      .extract({
        urls: ["https://example.com"],
        name: "Raw Extraction",
        extraction: (builder) => builder.raw("MARKDOWN"),
      })
      .create();

    expect(create.mock.calls[0]?.[0]).toMatchObject({
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
      {} as ConstructorParameters<typeof ExtractionBuilderService>[1],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[2],
    );

    await service
      .extract({
        urls: ["https://example.com"],
        name: "Raw Workflow",
        extraction: (builder) => builder.raw(["MARKDOWN", "PAGE_URL"]),
      })
      .create();

    expect(create.mock.calls[0]?.[0]).toMatchObject({
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

  test("run reuses an already started workflow job", async () => {
    const create = mock(async (_input: Record<string, unknown>) => ({
      id: "wf-reuse",
    }));
    const get = mock(async () => ({
      state: "ACTIVE",
      runState: "RUNNING",
      jobId: "job-existing",
    }));
    const runWorkflow = mock(async () => ({
      jobId: "job-new",
    }));
    const waitForJobCompletion = mock(async () => ({
      state: "FINISHED",
    }));

    const service = new ExtractionBuilderService(
      {
        create,
        get,
        runWorkflow,
        waitForJobCompletion,
      } as unknown as ConstructorParameters<typeof ExtractionBuilderService>[0],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[1],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[2],
    );

    const created = await service
      .extract({
        urls: ["https://example.com"],
        name: "Reuse Existing Job",
      })
      .create();

    await created.run({ limit: 1 });

    expect(runWorkflow).not.toHaveBeenCalled();
    expect(waitForJobCompletion).toHaveBeenCalledWith(
      "wf-reuse",
      "job-existing",
    );
  });

  test("submit reuses an already started workflow job", async () => {
    const create = mock(async (_input: Record<string, unknown>) => ({
      id: "wf-submit-reuse",
    }));
    const get = mock(async () => ({
      state: "ACTIVE",
      runState: "RUNNING",
      jobId: "job-existing",
    }));
    const runWorkflow = mock(async () => ({
      jobId: "job-new",
    }));

    const service = new ExtractionBuilderService(
      {
        create,
        get,
        runWorkflow,
      } as unknown as ConstructorParameters<typeof ExtractionBuilderService>[0],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[1],
      {} as ConstructorParameters<typeof ExtractionBuilderService>[2],
    );

    const created = await service
      .extract({
        urls: ["https://example.com"],
        name: "Reuse Existing Submit Job",
      })
      .create();

    const submitted = await created.submit({ limit: 1 });

    expect(runWorkflow).not.toHaveBeenCalled();
    expect(submitted).toEqual({
      workflowId: "wf-submit-reuse",
      jobId: "job-existing",
    });
  });
});
