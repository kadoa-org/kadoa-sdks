import { KadoaHttpException } from "../exceptions/http.exception";
import {
	type KadoaErrorCode,
	KadoaSdkException,
} from "../exceptions/kadoa-sdk.exception";
import type { KadoaSDK } from "../kadoa-sdk";
import {
	DEFAULT_API_BASE_URL,
	ENTITY_API_ENDPOINT,
	ERROR_MESSAGES,
} from "./constants";
import type {
	EntityPrediction,
	EntityRequestOptions,
	EntityResponse,
} from "./types";

/**
 * NOTE: This is a workaround for the /v4/entity endpoint which is not yet exposed in the OpenAPI spec.
 * Once the endpoint is added to the OpenAPI specification, this manual implementation should be
 * replaced with the generated client code.
 */

/**
 * Validates entity request options
 */
function validateEntityOptions(options: EntityRequestOptions): void {
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
async function buildRequestHeaders(
	config: KadoaSDK["configuration"],
): Promise<Record<string, string>> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Accept: "application/json",
	};

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

/**
 * Maps HTTP status codes to appropriate error codes
 */
function getErrorCodeFromStatus(status: number): KadoaErrorCode {
	if (status === 401 || status === 403) return "AUTH_ERROR";
	if (status === 404) return "NOT_FOUND";
	if (status === 429) return "RATE_LIMITED";
	if (status >= 400 && status < 500) return "VALIDATION_ERROR";
	if (status >= 500) return "HTTP_ERROR";
	return "UNKNOWN";
}

/**
 * Handles API error responses and throws appropriate exceptions
 */
async function handleErrorResponse(
	response: Response,
	url: URL,
	link: string,
): Promise<never> {
	let errorData: Record<string, unknown> | undefined;
	let errorText = "";

	try {
		errorText = await response.text();
		errorData = JSON.parse(errorText) as Record<string, unknown>;
	} catch {
		errorData = { message: errorText || response.statusText };
	}

	const baseErrorOptions = {
		httpStatus: response.status,
		endpoint: url.toString(),
		method: "POST" as const,
		responseBody: errorData,
		details: {
			url: url.toString(),
			link,
		},
	};

	if (response.status === 401) {
		throw new KadoaHttpException(ERROR_MESSAGES.AUTH_FAILED, {
			...baseErrorOptions,
			code: "AUTH_ERROR",
		});
	}

	if (response.status === 429) {
		throw new KadoaHttpException(ERROR_MESSAGES.RATE_LIMITED, {
			...baseErrorOptions,
			code: "RATE_LIMITED",
		});
	}

	if (response.status >= 500) {
		throw new KadoaHttpException(ERROR_MESSAGES.SERVER_ERROR, {
			...baseErrorOptions,
			code: "HTTP_ERROR",
		});
	}

	throw new KadoaHttpException(
		`Failed to fetch entity fields: ${errorData?.message || response.statusText}`,
		{
			...baseErrorOptions,
			code: getErrorCodeFromStatus(response.status),
		},
	);
}

/**
 * Fetches entity fields dynamically from the /v4/entity endpoint.
 * This is a workaround implementation using native fetch since the endpoint
 * is not yet included in the OpenAPI specification.
 *
 * @param sdk The Kadoa sdk instance containing configuration
 * @param options Request options including the link to analyze
 * @returns EntityPrediction containing the detected entity type and fields
 */
export async function fetchEntityFields(
	sdk: KadoaSDK,
	options: EntityRequestOptions,
): Promise<EntityPrediction> {
	validateEntityOptions(options);

	const url = new URL(ENTITY_API_ENDPOINT, sdk.baseUrl || DEFAULT_API_BASE_URL);
	const headers = await buildRequestHeaders(sdk.configuration);

	const requestBody: EntityRequestOptions = options;

	let response: Response;
	try {
		response = await fetch(url.toString(), {
			method: "POST",
			headers,
			body: JSON.stringify(requestBody),
		});
	} catch (error) {
		throw new KadoaSdkException(ERROR_MESSAGES.NETWORK_ERROR, {
			code: "NETWORK_ERROR",
			details: {
				url: url.toString(),
				link: options.link,
			},
			cause: error,
		});
	}

	if (!response.ok) {
		await handleErrorResponse(response, url, options.link);
	}

	let data: EntityResponse;
	try {
		data = (await response.json()) as EntityResponse;
	} catch (error) {
		throw new KadoaSdkException(ERROR_MESSAGES.PARSE_ERROR, {
			code: "INTERNAL_ERROR",
			details: {
				url: url.toString(),
				link: options.link,
			},
			cause: error,
		});
	}

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
