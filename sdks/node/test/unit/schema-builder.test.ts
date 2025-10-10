import { describe, expect, test } from "bun:test";
import { SchemaBuilder } from "../../src/domains/schemas/schema-builder";
import type {
  CreateSchemaRequest,
  SchemaResponse,
} from "../../src/domains/schemas/schemas.acl";
import type { SchemasService } from "../../src/domains/schemas/schemas.service";
import { SchemasService as SchemasServiceClass } from "../../src/domains/schemas/schemas.service";
import type { ExtractionSchemaField } from "../../src/generated";
import { KadoaSdkException } from "../../src/runtime/exceptions";

describe("SchemaBuilder", () => {
  describe("Validation", () => {
    test("throws error for duplicate field names (case-insensitive)", () => {
      expect(() => {
        new SchemaBuilder()
          .entity("Product")
          .field("title", "Title", "STRING", { example: "Example" })
          .field("Title", "Title 2", "STRING", { example: "Example" });
      }).toThrow(KadoaSdkException);
    });

    test("throws error for STRING field without example", () => {
      expect(() => {
        new SchemaBuilder().entity("Product").field("title", "Title", "STRING");
      }).toThrow(KadoaSdkException);
    });

    test("throws error for IMAGE field without example", () => {
      expect(() => {
        new SchemaBuilder().entity("Product").field("image", "Image", "IMAGE");
      }).toThrow(KadoaSdkException);
    });

    test("throws error for LINK field without example", () => {
      expect(() => {
        new SchemaBuilder().entity("Product").field("link", "Link", "LINK");
      }).toThrow(KadoaSdkException);
    });

    test("throws error for OBJECT field without example", () => {
      expect(() => {
        new SchemaBuilder()
          .entity("Product")
          .field("metadata", "Metadata", "OBJECT");
      }).toThrow(KadoaSdkException);
    });

    test("throws error for ARRAY field without example", () => {
      expect(() => {
        new SchemaBuilder().entity("Product").field("tags", "Tags", "ARRAY");
      }).toThrow(KadoaSdkException);
    });

    test("allows NUMBER field without example", () => {
      expect(() => {
        new SchemaBuilder().entity("Product").field("price", "Price", "NUMBER");
      }).not.toThrow();
    });

    test("allows BOOLEAN field without example", () => {
      expect(() => {
        new SchemaBuilder()
          .entity("Product")
          .field("inStock", "In Stock", "BOOLEAN");
      }).not.toThrow();
    });
  });

  describe("Field Building", () => {
    test("creates schema fields correctly", () => {
      const builder = new SchemaBuilder()
        .entity("Product")
        .field("title", "Product name", "STRING", { example: "Example" })
        .field("price", "Product price", "MONEY");

      expect(builder.fields).toHaveLength(2);
      expect(builder.fields[0]).toMatchObject({
        name: "title",
        description: "Product name",
        dataType: "STRING",
        fieldType: "SCHEMA",
        example: "Example",
      });
      expect(builder.fields[1]).toMatchObject({
        name: "price",
        description: "Product price",
        dataType: "MONEY",
        fieldType: "SCHEMA",
      });
    });

    test("creates classification fields correctly", () => {
      const builder = new SchemaBuilder()
        .entity("Article")
        .classify("sentiment", "Article sentiment", [
          { title: "Positive", definition: "Optimistic tone" },
          { title: "Negative", definition: "Critical tone" },
        ]);

      expect(builder.fields).toHaveLength(1);
      expect(builder.fields[0]).toMatchObject({
        name: "sentiment",
        description: "Article sentiment",
        fieldType: "CLASSIFICATION",
        categories: [
          { title: "Positive", definition: "Optimistic tone" },
          { title: "Negative", definition: "Critical tone" },
        ],
      });
    });

    test("creates raw metadata fields correctly", () => {
      const builder = new SchemaBuilder().raw("MARKDOWN");

      expect(builder.fields).toHaveLength(1);
      expect(builder.fields[0]).toMatchObject({
        name: "rawMarkdown",
        description: "Raw page content in MARKDOWN format",
        fieldType: "METADATA",
        metadataKey: "MARKDOWN",
      });
    });

    test("creates multiple raw fields at once", () => {
      const builder = new SchemaBuilder().raw(["HTML", "MARKDOWN", "PAGE_URL"]);

      expect(builder.fields).toHaveLength(3);
      expect(builder.fields[0].name).toBe("rawHtml");
      expect(builder.fields[1].name).toBe("rawMarkdown");
      expect(builder.fields[2].name).toBe("rawPageUrl");
    });

    test("prevents duplicate raw fields", () => {
      const builder = new SchemaBuilder().raw("MARKDOWN").raw("MARKDOWN");

      expect(builder.fields).toHaveLength(1);
    });

    test("combines schema fields with raw content", () => {
      const builder = new SchemaBuilder()
        .entity("Product")
        .field("title", "Product name", "STRING", { example: "Example" })
        .raw("HTML");

      expect(builder.fields).toHaveLength(2);
      expect(builder.fields[0].fieldType).toBe("SCHEMA");
      expect(builder.fields[1].fieldType).toBe("METADATA");
    });
  });

  describe("Builder State", () => {
    test("returns schema name when set", () => {
      const builder = new SchemaBuilder().entity("Product");
      expect(builder.entityName).toBe("Product");
    });

    test("raw-only extraction has no schema name", () => {
      const builder = new SchemaBuilder().raw("MARKDOWN");
      expect(builder.entityName).toBeUndefined();
    });
  });

  describe("Key Field Option", () => {
    test("sets isKey option correctly", () => {
      const builder = new SchemaBuilder()
        .entity("Product")
        .field("id", "Product ID", "STRING", {
          example: "12345",
          isKey: true,
        });
      const field = builder.fields[0] as ExtractionSchemaField;
      expect(field.isKey).toBe(true);
    });
  });
});

describe("SchemasService.builder()", () => {
  test("returns a SchemaBuilder instance with entity name set", () => {
    const mockService = { createSchema: async () => ({}) } as SchemasService;

    const builder = SchemasServiceClass.prototype.builder.call(
      mockService,
      "Product",
    );

    expect(builder).toBeInstanceOf(SchemaBuilder);
    expect(builder.entityName).toBe("Product");
  });

  test("builder create delegates to service", async () => {
    const captured: CreateSchemaRequest[] = [];
    const response: SchemaResponse = {
      id: "schema_123",
      name: "My Product Schema",
      entity: "Product",
      fields: [],
      version: 1,
      createdAt: "",
      updatedAt: "",
    };

    const mockService = {
      createSchema: async (body: CreateSchemaRequest) => {
        captured.push(body);
        return response;
      },
    } as SchemasService;

    const builder = SchemasServiceClass.prototype.builder.call(
      mockService,
      "Product",
    );

    builder
      .field("title", "Product name", "STRING", { example: "Example" })
      .field("price", "Product price", "NUMBER");

    const result = await builder.create("My Product Schema");

    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      name: "My Product Schema",
      entity: "Product",
    });
    expect(result).toBe(response);
  });
});
