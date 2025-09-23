import type { KadoaClient } from "../kadoa-client";
import { SchemasService } from "../internal/domains/schemas/schemas.service";

/**
 * Schemas module for managing schemas
 */
export class SchemasModule {
	public readonly service: SchemasService;

	constructor(client: KadoaClient) {
		this.service = new SchemasService(client);
	}
}
