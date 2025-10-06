import { afterAll, describe, expect, it } from "bun:test";
import { KadoaClient } from "../../src/kadoa-client";
import type { ExtractionSchemaField } from "../../src/generated";
import { getTestEnv } from "../utils/env";

describe("Schemas Module E2E", () => {
	const env = getTestEnv();
	const client = new KadoaClient({ apiKey: env.KADOA_API_KEY });
	const createdSchemaIds: string[] = [];

	afterAll(async () => {
		// Clean up created schemas
		for (const schemaId of createdSchemaIds) {
			try {
				await client.schema.delete(schemaId);
			} catch (error) {
				// Ignore cleanup errors
			}
		}
	});

	it("should create schema using body", async () => {
		const schema = await client.schema.create({
			name: "Test Product Schema",
			entity: "TestProduct",
			fields: [
				{
					name: "title",
					description: "Product title",
					dataType: "STRING",
					fieldType: "SCHEMA",
					example: "Test Product",
				},
				{
					name: "price",
					description: "Product price",
					dataType: "NUMBER",
					fieldType: "SCHEMA",
				},
			],
		});

		expect(schema).toBeDefined();
		expect(schema.id).toBeDefined();
		expect(schema.name).toBe("Test Product Schema");
		expect(schema.entity).toBe("TestProduct");

		createdSchemaIds.push(schema.id);
	});

	it("should reuse existing schema by ID", async () => {
		// Create a schema first
		const created = await client.schema.create({
			name: "Test Reusable Product Schema",
			entity: "TestReusableProduct",
			fields: [
				{
					name: "name",
					description: "Product name",
					dataType: "STRING",
					fieldType: "SCHEMA",
					example: "Example Product",
				},
			],
		});

		createdSchemaIds.push(created.id);

		// Retrieve it
		const retrieved = await client.schema.get(created.id);

		expect(retrieved).toBeDefined();
		expect(retrieved.id).toBe(created.id);
		expect(retrieved.entity).toBe("TestReusableProduct");
		expect(retrieved.name).toBe("Test Reusable Product Schema");
	});

	it("should create schema using builder with all 3 field types", async () => {
		const schemaDefinition = client.schema
			.builder("TestCompleteProduct")
			.field("title", "Product title", "STRING", { example: "iPhone 15" })
			.field("price", "Product price", "NUMBER")
			.classify("sentiment", "Product sentiment", [
				{ title: "Positive", definition: "Good reviews" },
				{ title: "Negative", definition: "Bad reviews" },
			])
			.raw("HTML")
			.build();

		// Create the schema using the built definition
		const schema = await client.schema.create({
			name: "Test Complete Product Schema",
			entity: schemaDefinition.entityName,
			fields: schemaDefinition.fields,
		});

		expect(schema).toBeDefined();
		expect(schema.id).toBeDefined();
		expect(schema.entity).toBe("TestCompleteProduct");
		expect(schema.name).toBe("Test Complete Product Schema");

		createdSchemaIds.push(schema.id);

		// Verify the built definition structure before creation
		expect(schemaDefinition.entityName).toBe("TestCompleteProduct");
		expect(schemaDefinition.fields).toHaveLength(4);

		// Verify field types
		const schemaField: ExtractionSchemaField = schemaDefinition.fields.find(
			(f) => f.name === "title",
		) as ExtractionSchemaField;
		const numberField: ExtractionSchemaField = schemaDefinition.fields.find(
			(f) => f.name === "price",
		) as ExtractionSchemaField;
		const classificationField = schemaDefinition.fields.find(
			(f) => f.name === "sentiment",
		);
		const metadataField = schemaDefinition.fields.find(
			(f) => f.name === "rawHtml",
		);

		expect(schemaField?.fieldType).toBe("SCHEMA");
		expect(schemaField?.dataType).toBe("STRING");
		expect(numberField?.fieldType).toBe("SCHEMA");
		expect(numberField?.dataType).toBe("NUMBER");
		expect(classificationField?.fieldType).toBe("CLASSIFICATION");
		expect(metadataField?.fieldType).toBe("METADATA");
	});

	it("should support fluent API with create method", async () => {
		const schema = await client.schema
			.builder("TestFluentProduct")
			.field("title", "Product name", "STRING", { example: "iPhone 15" })
			.field("price", "Product price", "NUMBER")
			.create("Test Fluent Product Schema");

		expect(schema).toBeDefined();
		expect(schema.id).toBeDefined();
		expect(schema.name).toBe("Test Fluent Product Schema");
		expect(schema.entity).toBe("TestFluentProduct");

		createdSchemaIds.push(schema.id);
	});
});
