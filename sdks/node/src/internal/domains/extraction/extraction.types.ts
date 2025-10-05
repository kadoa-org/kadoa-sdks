import type {
	V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInner,
	V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInnerOperatorEnum,
	ExtractionSchemaFieldDataTypeEnum,
	CreateWorkflowWithSchemaBodyIntervalEnum,
	CreateWorkflowWithSchemaBodyNavigationModeEnum,
	Location,
} from "../../../generated";

export type NavigationMode =
	(typeof CreateWorkflowWithSchemaBodyNavigationModeEnum)[keyof typeof CreateWorkflowWithSchemaBodyNavigationModeEnum];

export type EntityFieldDataType =
	(typeof ExtractionSchemaFieldDataTypeEnum)[keyof typeof ExtractionSchemaFieldDataTypeEnum];

export type WorkflowInterval =
	(typeof CreateWorkflowWithSchemaBodyIntervalEnum)[keyof typeof CreateWorkflowWithSchemaBodyIntervalEnum];

export type MonitoringOperator =
	(typeof V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInnerOperatorEnum)[keyof typeof V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInnerOperatorEnum];

export type MonitoringField =
	V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInner & {
		isKeyField?: boolean;
	};

export type LocationConfig = Location;
