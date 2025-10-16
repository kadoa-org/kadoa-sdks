import type { KadoaClient } from "../../kadoa-client";
import { KadoaSdkException } from "../../runtime/exceptions";
import {
  ERROR_MESSAGES,
  KadoaErrorCode,
} from "../../runtime/exceptions/base.exception";
import { logger } from "../../runtime/logger";
import { SchemaBuilder } from "./schema-builder";
import {
  type CreateSchemaRequest,
  type SchemaResponse,
  SchemasApi,
  type UpdateSchemaRequest,
} from "./schemas.acl";

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
   * Create a schema builder with fluent API and inline create support.
   */
  builder(
    entityName?: string,
  ): SchemaBuilder & { create(name?: string): Promise<SchemaResponse> } {
    const service = this;
    return new (class extends SchemaBuilder {
      constructor() {
        super();
        if (entityName) {
          this.entity(entityName);
        }
      }

      async create(name?: string): Promise<SchemaResponse> {
        const built = this.build();
        const schemaName = name ?? built.entityName;

        if (!schemaName) {
          throw new KadoaSdkException(
            "Schema name is required when entity name is not provided",
            {
              code: "VALIDATION_ERROR",
              details: { name },
            },
          );
        }

        const createSchemaBody = {
          name: schemaName,
          fields: built.fields,
          ...(built.entityName ? { entity: built.entityName } : {}),
        };

        return service.createSchema(
          createSchemaBody as CreateSchemaRequest,
        );
      }
    })();
  }

  /**
   * Get a schema by ID
   */
  async getSchema(schemaId: string): Promise<SchemaResponse> {
    debug("Fetching schema with ID: %s", schemaId);

    const response = await this.schemasApi.v4SchemasSchemaIdGet({
      schemaId,
    });

    const schemaData = response.data.data;

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

  /**
   * List all schemas
   */
  async listSchemas(): Promise<SchemaResponse[]> {
    const response = await this.schemasApi.v4SchemasGet();
    return response.data.data;
  }

  /**
   * Create a new schema
   */
  async createSchema(body: CreateSchemaRequest): Promise<SchemaResponse> {
    debug("Creating schema with name: %s", body.name);

    const response = await this.schemasApi.v4SchemasPost({
      createSchemaBody: body,
    });

    const schemaId = response.data.schemaId;

    if (!schemaId) {
      throw new KadoaSdkException(ERROR_MESSAGES.SCHEMA_CREATE_FAILED, {
        code: KadoaErrorCode.INTERNAL_ERROR,
      });
    }

    // Fetch the created schema to return the full schema object
    return this.getSchema(schemaId);
  }

  /**
   * Update an existing schema
   */
  async updateSchema(
    schemaId: string,
    body: UpdateSchemaRequest,
  ): Promise<SchemaResponse> {
    debug("Updating schema with ID: %s", schemaId);

    await this.schemasApi.v4SchemasSchemaIdPut({
      schemaId,
      updateSchemaBody: body,
    });

    // Fetch the updated schema to return the full schema object
    return this.getSchema(schemaId);
  }

  /**
   * Delete a schema
   */
  async deleteSchema(schemaId: string): Promise<void> {
    debug("Deleting schema with ID: %s", schemaId);

    await this.schemasApi.v4SchemasSchemaIdDelete({
      schemaId,
    });
  }
}
