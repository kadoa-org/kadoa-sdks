import type {
	CreateSchemaBody,
	SchemaResponse,
	UpdateSchemaBody,
} from "../generated";
import type { SchemasService } from "../internal/domains/schemas/schemas.service";
import { SchemaBuilder } from "../internal/domains/schemas/schema-builder";

/**
 * Schema builder with create capability
 * Extends SchemaBuilder to add direct schema creation
 */
class SchemaBuilderWithCreate extends SchemaBuilder {
	constructor(
		entityName: string,
		private readonly service: SchemasService,
	) {
		super();
		this.entity(entityName);
	}

	/**
	 * Create the schema directly in Kadoa
	 * @param name - Optional schema name (defaults to entity name)
	 * @returns Promise resolving to the created schema
	 */
	async create(name?: string): Promise<SchemaResponse> {
		const built = this.build();
		return this.service.createSchema({
			name: name || built.entityName,
			entity: built.entityName,
			fields: built.fields,
		});
	}
}

/**
 * Schemas module for managing schemas
 */
export class SchemasModule {
	constructor(private readonly service: SchemasService) {}

	/**
	 * Create a new schema builder for fluent schema definition
	 * @param entityName - The name of the entity this schema represents
	 * @returns A new SchemaBuilder instance with the entity name already set
	 * @example Build then create
	 * ```typescript
	 * const schema = kadoa.schema.builder("Product")
	 *   .field("title", "Product name", "STRING", { example: "iPhone 15" })
	 *   .field("price", "Product price", "NUMBER")
	 *   .build();
	 *
	 * await kadoa.schema.create(schema);
	 * ```
	 *
	 * @example Fluent chain with create
	 * ```typescript
	 * const schema = await kadoa.schema.builder("Product")
	 *   .field("title", "Product name", "STRING", { example: "iPhone 15" })
	 *   .field("price", "Product price", "NUMBER")
	 *   .create("Product Schema");
	 * ```
	 */
	builder(entityName: string): SchemaBuilderWithCreate {
		return new SchemaBuilderWithCreate(entityName, this.service);
	}

	/**
	 * Get a schema by ID
	 */
	async get(schemaId: string): Promise<SchemaResponse> {
		return this.service.getSchema(schemaId);
	}

	/**
	 * List all schemas
	 */
	async list(): Promise<SchemaResponse[]> {
		return this.service.listSchemas();
	}

	/**
	 * Create a new schema from a body
	 */
	async create(body: CreateSchemaBody): Promise<SchemaResponse> {
		return this.service.createSchema(body);
	}

	/**
	 * Update an existing schema
	 */
	async update(
		schemaId: string,
		body: UpdateSchemaBody,
	): Promise<SchemaResponse> {
		return this.service.updateSchema(schemaId, body);
	}

	/**
	 * Delete a schema
	 */
	async delete(schemaId: string): Promise<void> {
		return this.service.deleteSchema(schemaId);
	}
}
