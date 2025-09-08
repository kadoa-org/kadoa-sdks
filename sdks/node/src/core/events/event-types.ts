/**
 * Event payload definitions for entity detection
 */
export type EntityEventPayloads = {
	"entity:detected": {
		/** Name of the detected entity type (e.g., "Product", "Article", "Job Listing") */
		entity: string;
		/** Data fields detected for the entity */
		fields: Array<{
			name: string;
			description: string;
			example: string;
			dataType: string | Record<string, unknown>;
			isPrimaryKey?: boolean;
		}>;
		/** URL that was analyzed for entity detection */
		url: string;
	};
};

/**
 * Event payload definitions for extraction workflow
 */
export type ExtractionEventPayloads = {
	"extraction:started": {
		/** Unique ID of the extraction process */
		workflowId: string;
		/** Name given to this extraction */
		name: string;
		/** URLs to extract data from */
		urls: string[];
	};
	"extraction:status_changed": {
		/** Unique ID of the extraction process */
		workflowId: string;
		/** Previous processing state */
		previousState?: string;
		/** Previous execution status */
		previousRunState?: string;
		/** Current processing state */
		currentState?: string;
		/** Current execution status */
		currentRunState?: string;
	};
	"extraction:data_available": {
		/** Unique ID of the extraction process */
		workflowId: string;
		/** Number of data records retrieved */
		recordCount: number;
		/** Whether this is a partial data set */
		isPartial: boolean;
	};
	"extraction:completed": {
		/** Unique ID of the extraction process */
		workflowId: string;
		/** Whether the extraction completed successfully */
		success: boolean;
		/** Final execution status */
		finalRunState?: string;
		/** Final processing state */
		finalState?: string;
		/** Number of records extracted (if successful) */
		recordCount?: number;
		/** Error message (if failed) */
		error?: string;
	};
};

/**
 * Combined event payload map for all SDK events
 */
export type EventPayloadMap = EntityEventPayloads & ExtractionEventPayloads;
