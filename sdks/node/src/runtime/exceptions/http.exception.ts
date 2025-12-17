import { type AxiosError, isAxiosError } from "axios";
import { type KadoaErrorCode, KadoaSdkException } from "./base.exception";

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

  toDetailedString(): string {
    const parts = [`${this.name}: ${this.message}`, `Code: ${this.code}`];
    if (this.httpStatus) {
      parts.push(`HTTP Status: ${this.httpStatus}`);
    }
    if (this.method && this.endpoint) {
      parts.push(`Request: ${this.method} ${this.endpoint}`);
    }
    if (this.requestId) {
      parts.push(`Request ID: ${this.requestId}`);
    }
    if (this.responseBody) {
      parts.push(
        `Response Body: ${JSON.stringify(this.responseBody, null, 2)}`,
      );
    }
    if (this.details && Object.keys(this.details).length > 0) {
      parts.push(`Details: ${JSON.stringify(this.details, null, 2)}`);
    }
    if (this.cause) {
      parts.push(`Cause: ${this.cause}`);
    }
    return parts.join("\n");
  }

  static wrap(
    error: unknown,
    extra?: { message?: string; details?: Record<string, unknown> },
  ): KadoaSdkException | KadoaHttpException {
    if (error instanceof KadoaHttpException) return error;
    if (error instanceof KadoaSdkException) return error;
    if (isAxiosError(error)) {
      return KadoaHttpException.fromAxiosError(error, extra);
    }
    return KadoaSdkException.wrap(error, extra);
  }

  static mapStatusToCode(errorOrStatus: AxiosError | number): KadoaErrorCode {
    const status =
      typeof errorOrStatus === "number"
        ? errorOrStatus
        : errorOrStatus.response?.status;

    if (!status) {
      if (typeof errorOrStatus === "number") return "UNKNOWN";
      return errorOrStatus.code === "ECONNABORTED"
        ? "TIMEOUT"
        : errorOrStatus.request
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
