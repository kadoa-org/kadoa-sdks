export type KadoaErrorCode =
	| "UNKNOWN"
	| "CONFIG_ERROR"
	| "AUTH_ERROR"
	| "VALIDATION_ERROR"
	| "NOT_FOUND"
	| "RATE_LIMITED"
	| "TIMEOUT"
	| "NETWORK_ERROR"
	| "HTTP_ERROR"
	| "INTERNAL_ERROR";

export type KadoaSdkExceptionOptions = {
	code?: KadoaErrorCode;
	details?: Record<string, unknown>;
	cause?: unknown;
};

export class KadoaSdkException extends Error {
	readonly code: KadoaErrorCode;
	readonly details?: Record<string, unknown>;
	readonly cause?: unknown;

	static readonly ERROR_MESSAGES = {
		// General errors
		CONFIG_ERROR: "Invalid configuration provided",
		AUTH_FAILED: "Authentication failed. Please check your API key",
		RATE_LIMITED: "Rate limit exceeded. Please try again later",
		NETWORK_ERROR: "Network error occurred",
		SERVER_ERROR: "Server error occurred",
		PARSE_ERROR: "Failed to parse response",

		// Workflow specific errors
		NO_WORKFLOW_ID: "Failed to start extraction process - no ID received",
		WORKFLOW_CREATE_FAILED: "Failed to create workflow",
		WORKFLOW_TIMEOUT: "Workflow processing timed out",
		WORKFLOW_UNEXPECTED_STATUS: "Extraction completed with unexpected status",
		PROGRESS_CHECK_FAILED: "Failed to check extraction progress",
		DATA_FETCH_FAILED: "Failed to retrieve extracted data from workflow",

		// Extraction specific errors
		NO_URLS: "At least one URL is required for extraction",
		NO_API_KEY: "API key is required for entity detection",
		LINK_REQUIRED: "Link is required for entity field detection",
		NO_PREDICTIONS: "No entity predictions returned from the API",
		EXTRACTION_FAILED: "Data extraction failed for the provided URLs",
		ENTITY_FETCH_FAILED: "Failed to fetch entity fields",
	} as const;

	constructor(message: string, options?: KadoaSdkExceptionOptions) {
		super(message);
		this.name = "KadoaSdkException";
		this.code = options?.code ?? "UNKNOWN";
		this.details = options?.details;
		if (options && "cause" in options) this.cause = options.cause;
		Error.captureStackTrace?.(this, KadoaSdkException);
	}

	static from(
		error: unknown,
		details?: Record<string, unknown>,
	): KadoaSdkException {
		if (error instanceof KadoaSdkException) return error;
		const message =
			error instanceof Error
				? error.message
				: typeof error === "string"
					? error
					: "Unexpected error";
		return new KadoaSdkException(message, {
			code: "UNKNOWN",
			details,
			cause: error,
		});
	}

	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			details: this.details,
		};
	}

	toString(): string {
		return [this.name, this.code, this.message].filter(Boolean).join(": ");
	}

	toDetailedString(): string {
		const parts = [`${this.name}: ${this.message}`, `Code: ${this.code}`];
		if (this.details && Object.keys(this.details).length > 0) {
			parts.push(`Details: ${JSON.stringify(this.details, null, 2)}`);
		}
		if (this.cause) {
			parts.push(`Cause: ${this.cause}`);
		}
		return parts.join("\n");
	}

	static isInstance(error: unknown): error is KadoaSdkException {
		return error instanceof KadoaSdkException;
	}

	static wrap(
		error: unknown,
		extra?: { message?: string; details?: Record<string, unknown> },
	): KadoaSdkException {
		if (error instanceof KadoaSdkException) return error;
		const message =
			extra?.message ||
			(error instanceof Error
				? error.message
				: typeof error === "string"
					? error
					: "Unexpected error");
		return new KadoaSdkException(message, {
			code: "UNKNOWN",
			details: extra?.details,
			cause: error,
		});
	}
}

export const ERROR_MESSAGES = KadoaSdkException.ERROR_MESSAGES;
