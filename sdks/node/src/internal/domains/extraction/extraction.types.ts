import type {
	V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInner,
	V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInnerOperatorEnum,
	ExtractionSchemaFieldDataTypeEnum,
	CreateWorkflowWithSchemaBodyIntervalEnum,
	CreateWorkflowWithSchemaBodyNavigationModeEnum,
	Location,
	ExtractionMetadataFieldMetadataKeyEnum,
	ExtractionMetadataFieldFieldTypeEnum,
	ExtractionClassificationFieldFieldTypeEnum,
	ExtractionSchemaFieldFieldTypeEnum,
} from "../../../generated";

export type NavigationMode =
	(typeof CreateWorkflowWithSchemaBodyNavigationModeEnum)[keyof typeof CreateWorkflowWithSchemaBodyNavigationModeEnum];

export type DataTypeInternal =
	(typeof ExtractionSchemaFieldDataTypeEnum)[keyof typeof ExtractionSchemaFieldDataTypeEnum];

export type DataType = Exclude<
	DataTypeInternal,
	| "CURRENCY"
	| "JOB_DESCRIPTION"
	| "CATEGORY_JOB_TYPES"
	| "CLASSIFICATION"
	| "CATEGORIZE"
	| "STATIC_SCRAPER_DATA"
	| "UNIQUE_ID"
	| "JOBBIRD_CUSTOM"
	| "PASS"
	| "ADDITIONAL_DATA"
>;

export type MetadataKey =
	(typeof ExtractionMetadataFieldMetadataKeyEnum)[keyof typeof ExtractionMetadataFieldMetadataKeyEnum];

export type WorkflowInterval =
	(typeof CreateWorkflowWithSchemaBodyIntervalEnum)[keyof typeof CreateWorkflowWithSchemaBodyIntervalEnum];

export type MonitoringOperator =
	(typeof V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInnerOperatorEnum)[keyof typeof V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInnerOperatorEnum];

export type MonitoringField =
	V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInner & {
		isKeyField?: boolean;
	};

export type LocationConfig = Location;

export type RawFormat =
	(typeof ExtractionMetadataFieldMetadataKeyEnum)[keyof typeof ExtractionMetadataFieldMetadataKeyEnum];

export type FieldType =
	| ExtractionMetadataFieldFieldTypeEnum
	| ExtractionClassificationFieldFieldTypeEnum
	| ExtractionSchemaFieldFieldTypeEnum;
