import type { AxiosResponse } from "axios";
import { DEFAULT_API_BASE_URL } from "../../../internal/runtime/config";
import {
	KadoaHttpException,
	KadoaSdkException,
} from "../../../internal/runtime/exceptions";
import { ERROR_MESSAGES } from "../../../internal/runtime/exceptions/base.exception";
import type { KadoaClient } from "../../../kadoa-client";
import type {
	EntityPrediction,
	EntityRequestOptions,
	EntityResponse,
} from "../extraction.types";

export const ENTITY_API_ENDPOINT = "/v4/entity";

/**
 * Service for detecting entities and their fields from web pages
 *
 * NOTE: This is a workaround for the /v4/entity endpoint which is not yet exposed in the OpenAPI spec.
 * Once the endpoint is added to the OpenAPI specification, this manual implementation should be
 * replaced with the generated client code.
 */
export class EntityDetectorService {
	constructor(private readonly client: KadoaClient) {}

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

		const url = `${this.client.baseUrl || DEFAULT_API_BASE_URL}${ENTITY_API_ENDPOINT}`;
		const headers = await this.buildRequestHeaders();
		const requestBody: EntityRequestOptions = options;

		try {
			const response: AxiosResponse<EntityResponse> =
				await this.client.axiosInstance.post(url, requestBody, {
					headers,
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
		} catch (error) {
			throw KadoaHttpException.wrap(error, {
				details: {
					url,
					link: options.link,
				},
			});
		}
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

	/**
	 * Builds request headers including API key authentication
	 */
	private async buildRequestHeaders(): Promise<Record<string, string>> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			Accept: "application/json",
		};

		const config = this.client.configuration;

		if (config?.apiKey) {
			if (typeof config.apiKey === "function") {
				const apiKeyValue = await config.apiKey("X-API-Key");
				if (apiKeyValue) {
					headers["X-API-Key"] = apiKeyValue;
				}
			} else if (typeof config.apiKey === "string") {
				headers["X-API-Key"] = config.apiKey;
			}
		} else {
			throw new KadoaSdkException(ERROR_MESSAGES.NO_API_KEY, {
				code: "AUTH_ERROR",
				details: { hasConfig: !!config, hasApiKey: !!config?.apiKey },
			});
		}

		return headers;
	}
}
