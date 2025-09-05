import type { AxiosError } from "axios";
import { type KadoaErrorCode, KadoaSdkException } from "./kadoa-sdk.exception";

export type KadoaHttpExceptionOptions = {
	httpStatus?: number;
	requestId?: string;
	endpoint?: string;
	method?: string;
	responseBody?: unknown;
	details?: Record<string, unknown>;
	code?: KadoaErrorCode;
	cause?: unknown;
};

export class KadoaHttpException extends KadoaSdkException {
	readonly httpStatus?: number;
	readonly requestId?: string;
	readonly endpoint?: string;
	readonly method?: string;
	readonly responseBody?: unknown;

	constructor(message: string, options?: KadoaHttpExceptionOptions) {
		super(message, {
			code: options?.code,
			details: options?.details,
			cause: options?.cause,
		});
		this.name = "KadoaHttpException";
		this.httpStatus = options?.httpStatus;
		this.requestId = options?.requestId;
		this.endpoint = options?.endpoint;
		this.method = options?.method;
		this.responseBody = options?.responseBody;
	}

	static fromAxiosError(
		error: AxiosError,
		extra?: { message?: string; details?: Record<string, unknown> },
	): KadoaHttpException {
		const status = error.response?.status;
		const requestId =
			(error.response?.headers?.["x-request-id"] as string | undefined) ||
			(error.response?.headers?.["x-amzn-requestid"] as string | undefined);
		const method = error.config?.method?.toUpperCase();
		const url = error.config?.url;

		return new KadoaHttpException(extra?.message || error.message, {
			code: KadoaHttpException.mapStatusToCode(error),
			httpStatus: status,
			requestId,
			endpoint: url,
			method,
			responseBody: error.response?.data,
			details: extra?.details,
			cause: error,
		});
	}

	toJSON(): Record<string, unknown> {
		return {
			...super.toJSON(),
			httpStatus: this.httpStatus,
			requestId: this.requestId,
			endpoint: this.endpoint,
			method: this.method,
			responseBody: this.responseBody,
		};
	}

	private static mapStatusToCode(error: AxiosError): KadoaErrorCode {
		const status = error.response?.status;
		if (!status) {
			return error.code === "ECONNABORTED"
				? "TIMEOUT"
				: error.request
					? "NETWORK_ERROR"
					: "UNKNOWN";
		}
		if (status === 401 || status === 403) return "AUTH_ERROR";
		if (status === 404) return "NOT_FOUND";
		if (status === 408) return "TIMEOUT";
		if (status === 429) return "RATE_LIMITED";
		if (status >= 400 && status < 500) return "VALIDATION_ERROR";
		if (status >= 500) return "HTTP_ERROR";
		return "UNKNOWN";
	}
}
