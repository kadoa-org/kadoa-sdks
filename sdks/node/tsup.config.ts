import { defineConfig } from "tsup";

export default defineConfig([
	// Node.js build
	{
		entry: ["src/index.ts"],
		format: ["cjs", "esm"],
		dts: {
			resolve: true,
			entry: "./src/index.ts",
		},
		splitting: false,
		sourcemap: true,
		clean: true,
		minify: false,
		treeshake: true,
		external: ["axios", "events", "ws"],
		tsconfig: "tsconfig.json",
	},
	// Browser build
	{
		entry: ["src/index.ts"],
		format: ["iife"],
		outDir: "dist/browser",
		globalName: "KadoaSDK",
		platform: "browser",
		splitting: false,
		sourcemap: true,
		minify: true,
		treeshake: true,
		define: {
			"process.env.KADOA_PUBLIC_API_URI": JSON.stringify(
				"https://api.kadoa.com",
			),
			"process.env.KADOA_WSS_API_URI": JSON.stringify(
				"wss://realtime.kadoa.com",
			),
			"process.env.KADOA_REALTIME_API_URI": JSON.stringify(
				"https://realtime.kadoa.com",
			),
			global: "window",
		},
		esbuildOptions(options) {
			options.external = ["ws"]; // WebSocket not needed for basic browser usage
			// Handle Node.js built-in modules for browser
			options.define = {
				...options.define,
				"import.meta.url": "undefined",
			};
			// Replace Node.js url module imports with browser-compatible alternatives
			options.alias = {
				...options.alias,
				url: "./src/polyfills/url-polyfill.js",
			};
			// Ensure proper IIFE global assignment
			options.globalName = "KadoaSDK";
		},
		tsconfig: "tsconfig.json",
	},
]);
