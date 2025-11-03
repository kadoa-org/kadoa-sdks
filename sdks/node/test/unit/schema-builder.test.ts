import { describe, expect, test } from "bun:test";
import { SchemaBuilder } from "../../src/domains/schemas/schema-builder";
import type { DataField } from "../../src/generated";
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

  describe("Entity Requirement", () => {
    test("allows raw-only schema without entity", () => {
      expect(() => new SchemaBuilder().raw("MARKDOWN").build()).not.toThrow();
    });

    test("allows classification-only schema without entity", () => {
      expect(() =>
        new SchemaBuilder()
          .classify("sentiment", "Sentiment", [
            { title: "Positive", definition: "Good" },
          ])
          .build(),
      ).not.toThrow();
    });

    test("allows raw and classification schema without entity", () => {
      expect(() =>
        new SchemaBuilder()
          .raw("HTML")
          .classify("category", "Category", [
            { title: "Tech", definition: "Technology" },
          ])
          .build(),
      ).not.toThrow();
    });

    test("requires entity when schema fields are present", () => {
      expect(() =>
        new SchemaBuilder()
          .field("title", "Title", "STRING", { example: "Test" })
          .build(),
      ).toThrow(KadoaSdkException);
    });

    test("requires entity when mixing schema with other fields", () => {
      expect(() =>
        new SchemaBuilder()
          .field("title", "Title", "STRING", { example: "Test" })
          .raw("HTML")
          .build(),
      ).toThrow(KadoaSdkException);
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
      const field = builder.fields[0] as DataField;
      expect(field.isKey).toBe(true);
    });
  });
});
