import { SchemasApi } from "../../../generated";
import type { KadoaClient } from "../../../kadoa-client";
import { KadoaSdkException } from "../../runtime/exceptions";
import {
	ERROR_MESSAGES,
	KadoaErrorCode,
} from "../../runtime/exceptions/base.exception";
import { logger } from "../../runtime/logger";
import type { SchemaField } from "../extraction/services/entity-resolver.service";

export type { SchemaField };

export interface Schema {
	entity: string;
	schema: SchemaField[];
}

const debug = logger.schemas;

/**
 * Service for managing schemas
 */
export class SchemasService {
	private readonly schemasApi: SchemasApi;

	constructor(client: KadoaClient) {
		this.schemasApi = new SchemasApi(client.configuration);
	}

	/**
	 * Get a schema by ID
	 * //todo: use proper schema type for response from generated client (when avaialble)
	 */
	async getSchema(schemaId: string): Promise<Schema> {
		debug("Fetching schema with ID: %s", schemaId);

		const response = await this.schemasApi.v4SchemasSchemaIdGet({
			schemaId,
		});

		const schemaData = (response.data as any).data;

		if (!schemaData) {
			throw new KadoaSdkException(
				`${ERROR_MESSAGES.SCHEMA_NOT_FOUND}: ${schemaId}`,
				{
					code: KadoaErrorCode.NOT_FOUND,
					details: { schemaId },
				},
			);
		}

		return schemaData;
	}
}
