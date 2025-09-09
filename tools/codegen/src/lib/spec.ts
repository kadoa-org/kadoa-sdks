import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { OPENAPI_SPEC_PATH, SPECS_DIR } from "../config";
export const OPENAPI_ENDPOINT = process.env.KADOA_OPENAPI_ENDPOINT;

export interface SpecMetadata {
	fetchedAt: string;
	apiVersion?: string;
	checksum: string;
	endpoint: string;
}

export interface FetchSpecOptions {
	force?: boolean;
	endpoint?: string;
	timeout?: number;
	maxRetries?: number;
}

const METADATA_PATH = path.join(SPECS_DIR, "openapi-metadata.json");
const CACHE_TTL = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;

function calculateChecksum(content: string): string {
	return crypto.createHash("sha256").update(content).digest("hex");
}

function isCacheValid(): boolean {
	if (!fs.existsSync(METADATA_PATH) || !fs.existsSync(OPENAPI_SPEC_PATH)) {
		return false;
	}

	try {
		const metadata: SpecMetadata = JSON.parse(
			fs.readFileSync(METADATA_PATH, "utf-8"),
		);
		const fetchedAt = new Date(metadata.fetchedAt).getTime();
		const now = Date.now();

		return now - fetchedAt < CACHE_TTL;
	} catch {
		return false;
	}
}

async function fetchWithRetry(
	url: string,
	options: RequestInit,
	maxRetries: number,
	timeoutMs: number,
): Promise<Response> {
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
		let backoffMs = 0;

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal,
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return response;
		} catch (error) {
			lastError = error as Error;
			if (attempt < maxRetries) {
				backoffMs = Math.min(1000 * 2 ** (attempt - 1), 10000);
				console.debug(
					`Retry ${attempt}/${maxRetries} failed for ${url}: ${
						(error as Error)?.message ?? String(error)
					}. Waiting ${backoffMs}ms before next attempt`,
				);
			} else {
				console.debug(
					`Retry ${attempt}/${maxRetries} failed for ${url}: ${
						(error as Error)?.message ?? String(error)
					}`,
				);
			}
		} finally {
			clearTimeout(timeoutId);
		}

		if (backoffMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, backoffMs));
		}
	}

	console.error(
		`Failed to fetch OpenAPI spec from ${url} after ${maxRetries} attempts: ${
			lastError?.message ?? "unknown error"
		}`,
	);
	throw lastError || new Error("Failed to fetch OpenAPI spec");
}

export async function fetchOpenAPISpec(
	{ force, endpoint, timeout, maxRetries }: FetchSpecOptions = {
		force: false,
		endpoint: OPENAPI_ENDPOINT,
		timeout: DEFAULT_TIMEOUT,
		maxRetries: DEFAULT_MAX_RETRIES,
	},
): Promise<void> {
	if (!endpoint) {
		throw new Error("KADOA_OPENAPI_ENDPOINT is not set");
	}

	try {
		console.debug("Fetching OpenAPI spec from", endpoint);
		const response = await fetchWithRetry(
			endpoint,
			{
				headers: {
					Accept: "application/json",
					"User-Agent": "Kadoa-SDK-Generator/1.0",
				},
			},
			maxRetries ?? DEFAULT_MAX_RETRIES,
			timeout ?? DEFAULT_TIMEOUT,
		);
		const specContent = await response.text();

		let spec: unknown;
		try {
			spec = JSON.parse(specContent);
		} catch (error) {
			throw new Error(`Invalid JSON in OpenAPI spec: ${error}`);
		}

		if (
			typeof spec !== "object" ||
			spec === null ||
			(!("openapi" in spec) && !("swagger" in spec))
		) {
			throw new Error(
				"Invalid OpenAPI specification: missing openapi or swagger field",
			);
		}

		const checksum = calculateChecksum(specContent);

		const PREVIOUS_SPEC_PATH = path.join(SPECS_DIR, "openapi.previous.json");

		if (fs.existsSync(METADATA_PATH)) {
			try {
				const oldMetadata: SpecMetadata = JSON.parse(
					fs.readFileSync(METADATA_PATH, "utf-8"),
				);

				if (oldMetadata.checksum === checksum && !force) {
					// Check if spec file exists
					if (!fs.existsSync(OPENAPI_SPEC_PATH)) {
						console.log("OpenAPI spec file missing, restoring from remote");
						console.log("Writing OpenAPI spec to", OPENAPI_SPEC_PATH);
						fs.writeFileSync(OPENAPI_SPEC_PATH, JSON.stringify(spec, null, 2));
					} else {
						console.log("OpenAPI spec is up to date (no changes detected)");
					}
					
					oldMetadata.fetchedAt = new Date().toISOString();
					fs.writeFileSync(METADATA_PATH, JSON.stringify(oldMetadata, null, 2));
					return;
				}

				// Copy existing spec to previous if it exists
				if (fs.existsSync(OPENAPI_SPEC_PATH)) {
					console.log("OpenAPI spec changes detected");
					fs.copyFileSync(OPENAPI_SPEC_PATH, PREVIOUS_SPEC_PATH);
				}
			} catch {}
		}

		console.log("Writing OpenAPI spec to", OPENAPI_SPEC_PATH);
		fs.writeFileSync(OPENAPI_SPEC_PATH, JSON.stringify(spec, null, 2));

		const metaObj = spec as { [k: string]: unknown };
		const info =
			(metaObj.info as { version?: string } | undefined) ?? undefined;
		const metadata: SpecMetadata = {
			fetchedAt: new Date().toISOString(),
			apiVersion: info?.version,
			checksum,
			endpoint,
		};
		console.log("Writing OpenAPI metadata to", METADATA_PATH);
		fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2));

		if (fs.existsSync(PREVIOUS_SPEC_PATH)) {
			fs.unlinkSync(PREVIOUS_SPEC_PATH);
		}
	} catch (error) {
		throw new Error(
			`Unable to fetch OpenAPI spec from ${endpoint}: ${
				(error as Error)?.message ?? String(error)
			}`,
		);
	}
}
