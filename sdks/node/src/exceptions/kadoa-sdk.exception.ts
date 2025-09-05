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
}
