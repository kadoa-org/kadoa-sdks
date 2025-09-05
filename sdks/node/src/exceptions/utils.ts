import { AxiosError } from "axios";
import { KadoaHttpException } from "./http.exception";
import { KadoaSdkException } from "./kadoa-sdk.exception";

export function isKadoaSdkException(
	error: unknown,
): error is KadoaSdkException {
	return error instanceof KadoaSdkException;
}

export function isKadoaHttpException(
	error: unknown,
): error is KadoaHttpException {
	return error instanceof KadoaHttpException;
}

export function wrapKadoaError(
	error: unknown,
	extra?: { message?: string; details?: Record<string, unknown> },
): KadoaSdkException | KadoaHttpException {
	if (error instanceof AxiosError)
		return KadoaHttpException.fromAxiosError(error, extra);
	return KadoaSdkException.from(error, extra?.details);
}
