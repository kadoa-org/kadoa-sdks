import type { KadoaClient } from "../../kadoa-client";
import { RunExtractionCommand } from "./commands/run-extraction.command";
import type { ExtractionOptions, ExtractionResult } from "./extraction.types";

/**
 * ExtractionModule provides extraction-related functionality
 */
export class ExtractionModule {
	private readonly runExtractionCommand: RunExtractionCommand;

	constructor(client: KadoaClient) {
		this.runExtractionCommand = new RunExtractionCommand(client);
	}

	/**
	 * Run extraction workflow using dynamic entity detection
	 *
	 * @param options Extraction configuration options
	 * @returns ExtractionResult containing workflow ID, workflow details, and extracted data
	 *
	 * @example
	 * ```typescript
	 * const result = await client.extraction.run({
	 *   urls: ['https://example.com'],
	 *   name: 'My Extraction'
	 * });
	 * ```
	 */
	async run(options: ExtractionOptions): Promise<ExtractionResult> {
		return this.runExtractionCommand.execute(options);
	}
}
