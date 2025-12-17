/**
 * TS-SCHEMAS: schemas.mdx snippets
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { KadoaClient } from "../../../src/kadoa-client";
import { deleteSchemaByName } from "../../utils/cleanup-helpers";
import { getTestEnv } from "../../utils/env";

describe("TS-SCHEMAS: schemas.mdx snippets", () => {
  let client: KadoaClient;
  const createdWorkflowIds: string[] = [];

  beforeAll(() => {
    client = new KadoaClient({ apiKey: getTestEnv().KADOA_API_KEY });
  });

  afterAll(async () => {
    await Promise.all(
      createdWorkflowIds.map((id) =>
        client.workflow.delete(id).catch(() => {}),
      ),
    );
    client.dispose?.();
  });

  it(
    "TS-SCHEMAS-001: Working with schemas - builder pattern",
    async () => {
      // @docs-start TS-SCHEMAS-001
      const extraction = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: "Product Extraction",
          extraction: (builder) =>
            builder
              .entity("Product")
              .field("title", "Product name", "STRING", { example: "Laptop" })
              .field("price", "Product price", "MONEY")
              .field("inStock", "Availability", "BOOLEAN")
              .field("rating", "Star rating 1-5", "NUMBER"),
        })
        .create();
      // @docs-end TS-SCHEMAS-001

      expect(extraction).toBeDefined();
      expect(extraction.workflowId).toBeDefined();
      if (extraction.workflowId) createdWorkflowIds.push(extraction.workflowId);
    },
    { timeout: 120000 },
  );

  it("TS-SCHEMAS-002: Create schema", async () => {
    const schemaName = "Product Schema";
    await deleteSchemaByName(schemaName, client);

    // @docs-start TS-SCHEMAS-002
    const schema = await client.schema.createSchema({
      name: "Product Schema",
      entity: "Product",
      fields: [
        {
          name: "title",
          description: "Product name",
          fieldType: "SCHEMA",
          dataType: "STRING",
          example: "iPhone 15 Pro",
        },
        {
          name: "price",
          description: "Product price",
          fieldType: "SCHEMA",
          dataType: "MONEY",
        },
        {
          name: "inStock",
          description: "Availability",
          fieldType: "SCHEMA",
          dataType: "BOOLEAN",
        },
        {
          name: "rating",
          description: "Star rating",
          fieldType: "SCHEMA",
          dataType: "NUMBER",
        },
      ],
    });

    console.log("Schema created:", schema.id);
    // @docs-end TS-SCHEMAS-002

    expect(schema).toBeDefined();
    expect(schema.id).toBeDefined();
    if (schema.id) await client.schema.deleteSchema(schema.id);
  });

  it("TS-SCHEMAS-003: Get schema", async () => {
    const schemaName = "Test Schema for Get";
    await deleteSchemaByName(schemaName, client);

    // Setup: create a schema to retrieve
    const created = await client.schema.createSchema({
      name: schemaName,
      entity: "TestProduct",
      fields: [
        {
          name: "title",
          description: "Product name",
          fieldType: "SCHEMA",
          dataType: "STRING",
          example: "Test Product",
        },
      ],
    });

    // @docs-start TS-SCHEMAS-003
    const schema = await client.schema.getSchema(created.id);

    console.log(schema.name); // 'Product Schema'
    console.log(schema.entity); // 'Product'
    console.log(schema.schema); // Array of field definitions
    // @docs-end TS-SCHEMAS-003

    expect(schema).toBeDefined();
    expect(schema.name).toBe(schemaName);
    expect(schema.entity).toBeDefined();
    expect(schema.schema).toBeDefined();

    await client.schema.deleteSchema(created.id);
  });

  it("TS-SCHEMAS-004: Delete schema", async () => {
    const schemaName = "Schema to Delete";
    await deleteSchemaByName(schemaName, client);

    // Setup: create schema to delete
    const created = await client.schema.createSchema({
      name: schemaName,
      entity: "TestProduct",
      fields: [
        {
          name: "title",
          description: "Product name",
          fieldType: "SCHEMA",
          dataType: "STRING",
          example: "Test Product",
        },
      ],
    });

    // @docs-start TS-SCHEMAS-004
    await client.schema.deleteSchema(created.id);
    // @docs-end TS-SCHEMAS-004

    // Verify deletion
    try {
      await client.schema.getSchema(created.id);
      throw new Error("Schema should have been deleted");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it(
    "TS-SCHEMAS-005: Use saved schema",
    async () => {
      const schemaName = "Test Schema - TS-SCHEMAS-005";
      await deleteSchemaByName(schemaName, client);

      // Setup: create schema first
      const schema = await client.schema.createSchema({
        name: schemaName,
        entity: "Product",
        fields: [
          {
            name: "title",
            description: "Product name",
            fieldType: "SCHEMA",
            dataType: "STRING",
            example: "Sample Product",
          },
        ],
      });

      // @docs-start TS-SCHEMAS-005
      const extraction = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: "Product Extraction",
          extraction: () => ({ schemaId: schema.id }),
        })
        .create();

      const result = await extraction.run();
      // @docs-end TS-SCHEMAS-005

      expect(extraction).toBeDefined();
      expect(extraction.workflowId).toBeDefined();
      expect(result).toBeDefined();

      // Cleanup
      if (extraction.workflowId)
        await client.workflow.delete(extraction.workflowId).catch(() => {});
      await client.schema.deleteSchema(schema.id).catch(() => {});
    },
    { timeout: 300000 },
  );

  it("TS-SCHEMAS-006: Classification fields", async () => {
    const schemaName = "Article Schema";
    await deleteSchemaByName(schemaName, client);

    // @docs-start TS-SCHEMAS-006
    const schema = await client.schema.createSchema({
      name: "Article Schema",
      entity: "Article",
      fields: [
        {
          name: "title",
          description: "Article headline",
          fieldType: "SCHEMA",
          dataType: "STRING",
          example: "Breaking News",
        },
        {
          name: "category",
          description: "Article category",
          fieldType: "CLASSIFICATION",
          categories: [
            { title: "Technology", definition: "Tech news and updates" },
            { title: "Business", definition: "Business and finance" },
            { title: "Sports", definition: "Sports coverage" },
          ],
        },
      ],
    });
    // @docs-end TS-SCHEMAS-006

    expect(schema).toBeDefined();
    expect(schema.id).toBeDefined();
    if (schema.id) await client.schema.deleteSchema(schema.id);
  });

  it("TS-SCHEMAS-007: Metadata fields", async () => {
    const schemaName = "Article with Raw Content";
    await deleteSchemaByName(schemaName, client);

    // @docs-start TS-SCHEMAS-007
    const schema = await client.schema.createSchema({
      name: "Article with Raw Content",
      entity: "Article",
      fields: [
        {
          name: "title",
          description: "Article headline",
          fieldType: "SCHEMA",
          dataType: "STRING",
          example: "Latest News",
        },
        {
          name: "rawMarkdown",
          description: "Page content as Markdown",
          fieldType: "METADATA",
          metadataKey: "MARKDOWN",
        },
        {
          name: "rawHtml",
          description: "Page HTML source",
          fieldType: "METADATA",
          metadataKey: "HTML",
        },
        {
          name: "pageUrl",
          description: "Page URL",
          fieldType: "METADATA",
          metadataKey: "PAGE_URL",
        },
      ],
    });
    // @docs-end TS-SCHEMAS-007

    expect(schema).toBeDefined();
    expect(schema.id).toBeDefined();
    if (schema.id) await client.schema.deleteSchema(schema.id);
  });

  it("TS-SCHEMAS-00: Update schema", async () => {
    const schemaName = "Test Schema for Update";
    const updatedName = "Updated Product Schema";
    await deleteSchemaByName(schemaName, client);
    await deleteSchemaByName(updatedName, client);

    const created = await client.schema.createSchema({
      name: schemaName,
      entity: "TestProduct",
      fields: [
        {
          name: "title",
          description: "Product name",
          fieldType: "SCHEMA",
          dataType: "STRING",
          example: "Test Product",
        },
      ],
    });
    const schemaId = created.id;

    // @docs-start TS-SCHEMAS-008
    const updated = await client.schema.updateSchema(schemaId, {
      name: "Updated Product Schema",
      entity: "Product",
      fields: [
        {
          name: "title",
          description: "Product name",
          fieldType: "SCHEMA",
          dataType: "STRING",
          example: "MacBook Pro",
        },
        {
          name: "price",
          description: "Product price in USD",
          fieldType: "SCHEMA",
          dataType: "MONEY",
        },
        {
          name: "sku",
          description: "Stock keeping unit",
          fieldType: "SCHEMA",
          dataType: "STRING",
          example: "Stock keeping unit",
        },
      ],
    });

    console.log("Schema updated:", updated.id);
    // @docs-end TS-SCHEMAS-008

    expect(updated).toBeDefined();
    expect(updated.id).toBeDefined();
    if (updated.id) await client.schema.deleteSchema(updated.id);
  });
});
