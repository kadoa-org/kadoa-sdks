import { describe, expect, test } from "bun:test";
import { ExtractionBuilder } from "../../src/internal/domains/extraction/builders/extraction-builder";
import { KadoaSdkException } from "../../src/internal/runtime/exceptions";

describe("ExtractionBuilder", () => {
	describe("Validation", () => {
		test("throws error for invalid field name with underscore", () => {
			expect(() => {
				new ExtractionBuilder()
					.schema("Product")
					.field("product_name", "Product name", "STRING", {
						example: "Example",
					});
			}).toThrow(KadoaSdkException);
		});

		test("throws error for invalid field name with special characters", () => {
			expect(() => {
				new ExtractionBuilder()
					.schema("Product")
					.field("product-name", "Product name", "STRING", {
						example: "Example",
					});
			}).toThrow(KadoaSdkException);
		});

		test("throws error for duplicate field names (case-insensitive)", () => {
			expect(() => {
				new ExtractionBuilder()
					.schema("Product")
					.field("title", "Title", "STRING", { example: "Example" })
					.field("Title", "Title 2", "STRING", { example: "Example" });
			}).toThrow(KadoaSdkException);
		});

		test("throws error for STRING field without example", () => {
			expect(() => {
				new ExtractionBuilder()
					.schema("Product")
					.field("title", "Title", "STRING");
			}).toThrow(KadoaSdkException);
		});

		test("throws error for IMAGE field without example", () => {
			expect(() => {
				new ExtractionBuilder()
					.schema("Product")
					.field("image", "Image", "IMAGE");
			}).toThrow(KadoaSdkException);
		});

		test("throws error for LINK field without example", () => {
			expect(() => {
				new ExtractionBuilder().schema("Product").field("link", "Link", "LINK");
			}).toThrow(KadoaSdkException);
		});

		test("throws error for OBJECT field without example", () => {
			expect(() => {
				new ExtractionBuilder()
					.schema("Product")
					.field("metadata", "Metadata", "OBJECT");
			}).toThrow(KadoaSdkException);
		});

		test("throws error for ARRAY field without example", () => {
			expect(() => {
				new ExtractionBuilder()
					.schema("Product")
					.field("tags", "Tags", "ARRAY");
			}).toThrow(KadoaSdkException);
		});

		test("allows NUMBER field without example", () => {
			expect(() => {
				new ExtractionBuilder()
					.schema("Product")
					.field("price", "Price", "NUMBER");
			}).not.toThrow();
		});

		test("allows CURRENCY field without example", () => {
			expect(() => {
				new ExtractionBuilder()
					.schema("Product")
					.field("price", "Price", "CURRENCY");
			}).not.toThrow();
		});

		test("allows BOOLEAN field without example", () => {
			expect(() => {
				new ExtractionBuilder()
					.schema("Product")
					.field("inStock", "In Stock", "BOOLEAN");
			}).not.toThrow();
		});

		test("throws error when using both useSchema and schema", () => {
			expect(() => {
				new ExtractionBuilder().useSchema("schema-123").schema("Product");
			}).toThrow(KadoaSdkException);
		});

		test("throws error when using schema after useSchema", () => {
			expect(() => {
				new ExtractionBuilder().useSchema("schema-123").schema("Product");
			}).toThrow(KadoaSdkException);
		});
	});

	describe("Field Building", () => {
		test("creates schema fields correctly", () => {
			const builder = new ExtractionBuilder()
				.schema("Product")
				.field("title", "Product name", "STRING", { example: "Example" })
				.field("price", "Product price", "CURRENCY");

			const fields = builder.getFields();
			expect(fields).toHaveLength(2);
			expect(fields[0]).toMatchObject({
				name: "title",
				description: "Product name",
				dataType: "STRING",
				fieldType: "SCHEMA",
				example: "Example",
			});
			expect(fields[1]).toMatchObject({
				name: "price",
				description: "Product price",
				dataType: "CURRENCY",
				fieldType: "SCHEMA",
			});
		});

		test("creates classification fields correctly", () => {
			const builder = new ExtractionBuilder()
				.schema("Article")
				.classify("sentiment", "Article sentiment", [
					{ title: "Positive", definition: "Optimistic tone" },
					{ title: "Negative", definition: "Critical tone" },
				]);

			const fields = builder.getFields();
			expect(fields).toHaveLength(1);
			expect(fields[0]).toMatchObject({
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
			const builder = new ExtractionBuilder().raw("markdown");

			const fields = builder.getFields();
			expect(fields).toHaveLength(1);
			expect(fields[0]).toMatchObject({
				name: "rawMarkdown",
				description: "Raw page content in MARKDOWN format",
				fieldType: "METADATA",
				metadataKey: "MARKDOWN",
			});
		});

		test("creates multiple raw fields at once", () => {
			const builder = new ExtractionBuilder().raw(["html", "markdown", "url"]);

			const fields = builder.getFields();
			expect(fields).toHaveLength(3);
			expect(fields[0].name).toBe("rawHtml");
			expect(fields[1].name).toBe("rawMarkdown");
			expect(fields[2].name).toBe("rawUrl");
		});

		test("prevents duplicate raw fields", () => {
			const builder = new ExtractionBuilder().raw("markdown").raw("markdown");

			const fields = builder.getFields();
			expect(fields).toHaveLength(1);
		});

		test("combines schema fields with raw content", () => {
			const builder = new ExtractionBuilder()
				.schema("Product")
				.field("title", "Product name", "STRING", { example: "Example" })
				.raw("html");

			const fields = builder.getFields();
			expect(fields).toHaveLength(2);
			expect(fields[0].fieldType).toBe("SCHEMA");
			expect(fields[1].fieldType).toBe("METADATA");
		});
	});

	describe("Builder State", () => {
		test("returns schema name when set", () => {
			const builder = new ExtractionBuilder().schema("Product");
			expect(builder.getSchemaName()).toBe("Product");
		});

		test("returns schema ID when set", () => {
			const builder = new ExtractionBuilder().useSchema("schema-123");
			expect(builder.getSchemaId()).toBe("schema-123");
		});

		test("raw-only extraction has no schema name", () => {
			const builder = new ExtractionBuilder().raw("markdown");
			expect(builder.getSchemaName()).toBeUndefined();
			expect(builder.getSchemaId()).toBeUndefined();
		});
	});

	describe("Key Field Option", () => {
		test("sets isKey option correctly", () => {
			const builder = new ExtractionBuilder()
				.schema("Product")
				.field("id", "Product ID", "STRING", {
					example: "12345",
					isKey: true,
				});

			const fields = builder.getFields();
			expect(fields[0].isKey).toBe(true);
		});
	});
});
