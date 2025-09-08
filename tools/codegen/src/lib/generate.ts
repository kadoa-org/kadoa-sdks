import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { GENERATORS, type GeneratorConfig, OPENAPI_SPEC_PATH } from "../config";

export function ensureDirectoryExists(dirPath: string): void {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

export function cleanDirectory(dirPath: string): void {
	if (fs.existsSync(dirPath)) {
		fs.rmSync(dirPath, { recursive: true, force: true });
	}
}

export function generateClient(name: string, config: GeneratorConfig): void {
	if (!fs.existsSync(OPENAPI_SPEC_PATH)) {
		throw new Error(
			`OpenAPI spec not found at ${OPENAPI_SPEC_PATH}. Fetch it first.`,
		);
	}

	cleanDirectory(config.outputDir);
	ensureDirectoryExists(config.outputDir);

	const args: string[] = [
		"generate",
		"-i",
		OPENAPI_SPEC_PATH,
		"-g",
		config.generator,
		"-o",
		config.outputDir,
		"--skip-validate-spec",
	];

	if (config.additionalProperties) {
		const props = Object.entries(config.additionalProperties)
			.map(([key, value]) => `${key}=${value}`)
			.join(",");
		args.push("--additional-properties", props);
	}

	if (config.configOptions) {
		const opts = Object.entries(config.configOptions)
			.map(([key, value]) => `${key}=${value}`)
			.join(",");
		args.push("--config", opts);
	}

	const command = `bunx openapi-generator-cli ${args.join(" ")}`;

	try {
		execSync(command, {
			stdio: "inherit",
			cwd: process.cwd(),
		});
	} catch (error) {
		throw new Error(`Failed to generate ${name} client: ${String(error)}`);
	}
}

export function postProcessNodeClient(outputDir: string): void {}

export function postProcessPythonClient(outputDir: string): void {
	// Move openapi_client from temporary directory to Python SDK root
	const tempOpenapiClientDir = path.join(outputDir, "openapi_client");
	const targetOpenapiClientDir = path.join(outputDir, "..", "openapi_client");

	if (fs.existsSync(tempOpenapiClientDir)) {
		// Remove existing openapi_client in target if it exists
		if (fs.existsSync(targetOpenapiClientDir)) {
			fs.rmSync(targetOpenapiClientDir, { recursive: true, force: true });
		}

		// Move the generated openapi_client to SDK root
		fs.renameSync(tempOpenapiClientDir, targetOpenapiClientDir);

		// Clean up the temporary directory
		fs.rmSync(outputDir, { recursive: true, force: true });

		console.log(`✅ Moved openapi_client to Python SDK root`);
	}
}

export { GENERATORS };
