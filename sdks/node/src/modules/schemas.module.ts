import type {
	CreateSchemaBody,
	SchemaResponse,
	UpdateSchemaBody,
} from "../generated";
import type { SchemasService } from "../internal/domains/schemas/schemas.service";

/**
 * Schemas module for managing schemas
 */
export class SchemasModule {
	constructor(private readonly service: SchemasService) {}

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
