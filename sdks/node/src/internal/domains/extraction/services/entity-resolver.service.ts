import type { AxiosResponse } from "axios";
import type { KadoaClient } from "../../../../kadoa-client";
import { KadoaSdkException } from "../../../runtime/exceptions";
import { ERROR_MESSAGES } from "../../../runtime/exceptions/base.exception";
import { SchemasService } from "../../schemas/schemas.service";
import type { LocationConfig } from "../extraction.types";
import type {
	ExtractionClassificationField,
	ExtractionMetadataField,
	ExtractionSchemaField,
	ExtractionSchemaFieldDataTypeEnum,
} from "../../../../generated";

export type SchemaFieldDataTypeEnum = ExtractionSchemaFieldDataTypeEnum;

export type SchemaField =
	| ExtractionSchemaField
	| ExtractionClassificationField
	| ExtractionMetadataField;

export interface EntityPrediction {
	entity: string;
	fields: SchemaField[];
	primaryKeyField?: string;
	expectedResults?: string;
}

export interface EntityResponse {
	success: boolean;
	entityPrediction: EntityPrediction[];
	screenshots?: string[];
	location?: {
		type: string;
	};
}

export interface EntityRequestOptions {
	link: string;
	location?: LocationConfig;
	navigationMode?: string;
}

export interface ResolvedEntity {
	entity: string;
	fields: SchemaField[];
}

export type EntityConfig =
	| "ai-detection"
	| { schemId: string }
	| { name: string; fields: SchemaField[] };

export const ENTITY_API_ENDPOINT = "/v4/entity";

/**
 * Service for resolving entities and their fields from various sources
 *
 * NOTE: This is a workaround for the /v4/entity endpoint which is not yet exposed in the OpenAPI spec.
 * Once the endpoint is added to the OpenAPI specification, this manual implementation should be
 * replaced with the generated client code.
 */
export class EntityResolverService {
	private readonly schemasService: SchemasService;

	constructor(private readonly client: KadoaClient) {
		this.schemasService = new SchemasService(client);
	}

	/**
	 * Resolves entity and fields from the provided entity configuration
	 *
	 * @param entityConfig The entity configuration to resolve
	 * @param options Additional options for AI detection
	 * @returns Resolved entity with fields
	 */
	async resolveEntity(
		entityConfig: EntityConfig,
		options?: {
			link?: string;
			location?: LocationConfig;
			navigationMode?: string;
		},
	): Promise<ResolvedEntity> {
		if (entityConfig === "ai-detection") {
			if (!options?.link) {
				throw new KadoaSdkException(ERROR_MESSAGES.LINK_REQUIRED, {
					code: "VALIDATION_ERROR",
					details: { entityConfig, options },
				});
			}

			// Step 1: Detect entity fields using AI
			const entityPrediction = await this.fetchEntityFields({
				link: options.link,
				location: options.location,
				navigationMode: options.navigationMode,
			});

			return {
				entity: entityPrediction.entity,
				fields: entityPrediction.fields,
			};
		} else if (entityConfig) {
			if ("schemId" in entityConfig) {
				// Fetch schema from API to get entity and fields
				const schema = await this.schemasService.getSchema(
					entityConfig.schemId,
				);
				return {
					entity: schema.entity,
					fields: schema.schema,
				};
			} else if ("name" in entityConfig && "fields" in entityConfig) {
				return {
					entity: entityConfig.name,
					fields: entityConfig.fields,
				};
			}
		}

		throw new KadoaSdkException(ERROR_MESSAGES.ENTITY_INVARIANT_VIOLATION, {
			details: {
				entity: entityConfig,
			},
		});
	}

	/**
	 * Fetches entity fields dynamically from the /v4/entity endpoint.
	 * This is a workaround implementation using native fetch since the endpoint
	 * is not yet included in the OpenAPI specification.
	 *
	 * @param options Request options including the link to analyze
	 * @returns EntityPrediction containing the detected entity type and fields
	 */
	async fetchEntityFields(
		options: EntityRequestOptions,
	): Promise<EntityPrediction> {
		this.validateEntityOptions(options);

		const url = `${this.client.baseUrl}${ENTITY_API_ENDPOINT}`;
		const requestBody: EntityRequestOptions = options;

		const response: AxiosResponse<EntityResponse> =
			await this.client.axiosInstance.post(url, requestBody, {
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					"x-api-key": this.client.apiKey,
				},
			});

		const data = response.data;

		if (
			!data.success ||
			!data.entityPrediction ||
			data.entityPrediction.length === 0
		) {
			throw new KadoaSdkException(ERROR_MESSAGES.NO_PREDICTIONS, {
				code: "NOT_FOUND",
				details: {
					success: data.success,
					hasPredictions: !!data.entityPrediction,
					predictionCount: data.entityPrediction?.length || 0,
					link: options.link,
				},
			});
		}

		return data.entityPrediction[0];
	}

	/**
	 * Validates entity request options
	 */
	private validateEntityOptions(options: EntityRequestOptions): void {
		if (!options.link) {
			throw new KadoaSdkException(ERROR_MESSAGES.LINK_REQUIRED, {
				code: "VALIDATION_ERROR",
				details: { options },
			});
		}
	}
}
