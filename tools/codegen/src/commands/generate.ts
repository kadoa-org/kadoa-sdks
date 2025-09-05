import fs from "node:fs";
import type { Command } from "commander";
import { GENERATORS, OPENAPI_SPEC_PATH } from "../config";
import {
	generateClient,
	postProcessNodeClient,
	postProcessPythonClient,
} from "../lib/generate";
import { fetchOpenAPISpec } from "../lib/spec";

export function registerGenerate(program: Command): void {
	program
		.command("generate")
		.description("Generate SDK clients from the OpenAPI spec")
		.option("-c, --client <type>", "Generate specific client (node|python)")
		.option(
			"-f, --fetch-latest",
			"Fetch the latest OpenAPI spec before generating",
		)
		.option("--force", "Force fetch even if cache is valid")
		.option("-e, --endpoint <url>", "Custom OpenAPI endpoint URL")
		.action(
			async (opts: {
				client?: string;
				fetchLatest?: boolean;
				force?: boolean;
				endpoint?: string;
			}) => {
				const shouldFetch = Boolean(
					opts.fetchLatest || !fs.existsSync(OPENAPI_SPEC_PATH),
				);

				if (shouldFetch && !opts.endpoint) {
					console.error("--endpoint is required when fetching the spec");
					process.exit(1);
				}

				if (shouldFetch) {
					try {
						const forceFetch = Boolean(opts.force || opts.fetchLatest);
						await fetchOpenAPISpec({
							force: forceFetch,
							endpoint: opts.endpoint,
						});
					} catch (error) {
						if (!fs.existsSync(OPENAPI_SPEC_PATH)) {
							console.error(String(error));
							process.exit(1);
						}
					}
				}

				if (!fs.existsSync(OPENAPI_SPEC_PATH)) {
					console.error("OpenAPI spec not found");
					process.exit(1);
				}

				const clientType = opts.client;
				if (clientType) {
					if (clientType === "node" || clientType === "python") {
						generateClient(clientType, GENERATORS[clientType]);
						if (clientType === "node") {
							postProcessNodeClient(GENERATORS[clientType].outputDir);
						} else {
							postProcessPythonClient(GENERATORS[clientType].outputDir);
						}
					} else {
						console.error(`Invalid client type: ${clientType}`);
						process.exit(1);
					}
				} else {
					for (const [name, config] of Object.entries(GENERATORS)) {
						generateClient(name, config);
						if (name === "node") {
							postProcessNodeClient(config.outputDir);
						} else if (name === "python") {
							postProcessPythonClient(config.outputDir);
						}
					}
				}
			},
		);
}
