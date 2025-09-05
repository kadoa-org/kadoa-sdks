import type { V4WorkflowsWorkflowIdGet200Response } from "../generated";
import {
	V4WorkflowsWorkflowIdGet200ResponseDisplayStateEnum as WorkflowDisplayStateEnum,
	V4WorkflowsWorkflowIdGet200ResponseStateEnum as WorkflowStateEnum,
} from "../generated/models/v4-workflows-workflow-id-get200-response";
import type { WorkflowWithExistingSchemaNavigationModeEnum } from "../generated/models/workflow-with-existing-schema";

export { WorkflowDisplayStateEnum, WorkflowStateEnum };
export type NavigationMode =
	(typeof WorkflowWithExistingSchemaNavigationModeEnum)[keyof typeof WorkflowWithExistingSchemaNavigationModeEnum];

export type EntityFieldDataType =
	| "STRING"
	| "NUMBER"
	| "BOOLEAN"
	| "DATE"
	| "DATETIME"
	| "CURRENCY"
	| "IMAGE"
	| "LINK"
	| "OBJECT"
	| "ARRAY";

export interface EntityField {
	name: string;
	description: string;
	example: string;
	dataType: EntityFieldDataType;
	isPrimaryKey?: boolean;
}

export interface EntityPrediction {
	entity: string;
	fields: EntityField[];
	primaryKeyField?: string;
	expectedResults?: string;
}

export interface EntityResponse {
	success: boolean;
	entityPrediction: EntityPrediction[];
	screenshots?: string[];
	location?: {
		type: string;
	};
}

export interface EntityRequestOptions {
	link: string;
	location?: {
		type: string;
	};
	navigationMode?: string;
}

// Internal type with all required fields (after merge with defaults)
export interface ExtractionConfig {
	urls: string[];
	navigationMode: NavigationMode;
	name: string;
	location: {
		type: string;
	};
	pollingInterval: number;
	maxWaitTime: number;
}

// Public API type with optional fields (before merge with defaults)
export type ExtractionOptions = {
	urls: string[];
} & Partial<Omit<ExtractionConfig, "urls">>;

export interface ExtractionResult {
	workflowId: string | undefined;
	workflow?: V4WorkflowsWorkflowIdGet200Response;
	data?: Array<object>;
}
