import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, "../../../");
export const SPECS_DIR = path.join(ROOT_DIR, "specs");
export const NODE_SDK_DIR = path.join(ROOT_DIR, "sdks/node");
export const PYTHON_SDK_DIR = path.join(ROOT_DIR, "sdks/python");
export const OPENAPI_SPEC_PATH = path.join(SPECS_DIR, "openapi.json");

export interface GeneratorConfig {
	generator: string;
	outputDir: string;
	additionalProperties?: Record<string, string | boolean>;
	configOptions?: Record<string, string | boolean>;
}

export const GENERATORS: Record<string, GeneratorConfig> = {
	node: {
		generator: "typescript-axios",
		outputDir: path.join(NODE_SDK_DIR, "src/generated"),
		additionalProperties: {
			npmName: "@kadoa/api-client",
			npmVersion: "0.0.1",
			supportsES6: true,
			withInterfaces: true,
			useSingleRequestParameter: true,
			withSeparateModelsAndApi: true,
			apiPackage: "api",
			modelPackage: "models",
			withNodeImports: false, // Changed to false for browser compatibility
		},
	},
	python: {
		generator: "python",
		outputDir: path.join(PYTHON_SDK_DIR, ".generated_temp"),
		additionalProperties: {
			generateSourceCodeOnly: true,
			projectName: "kadoa_sdk",
			packageName: "openapi_client",
		},
	},
};
