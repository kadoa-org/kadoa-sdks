import type { SchemasService } from "../internal/domains/schemas/schemas.service";

/**
 * Schemas module for managing schemas
 */
export class SchemasModule {
	constructor(private readonly service: SchemasService) {}
}
