import type {
	V4WorkflowsWorkflowIdMetadataPutRequestMonitoring,
	V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInner,
	V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInnerOperatorEnum,
	WorkflowWithCustomSchemaFieldsInnerDataTypeEnum,
	WorkflowWithCustomSchemaIntervalEnum,
	WorkflowWithCustomSchemaLocation,
	WorkflowWithExistingSchemaNavigationModeEnum,
} from "../../../generated";

export type NavigationMode =
	(typeof WorkflowWithExistingSchemaNavigationModeEnum)[keyof typeof WorkflowWithExistingSchemaNavigationModeEnum];

export type EntityFieldDataType =
	(typeof WorkflowWithCustomSchemaFieldsInnerDataTypeEnum)[keyof typeof WorkflowWithCustomSchemaFieldsInnerDataTypeEnum];

export type WorkflowInterval =
	(typeof WorkflowWithCustomSchemaIntervalEnum)[keyof typeof WorkflowWithCustomSchemaIntervalEnum];

export type MonitoringOperator =
	(typeof V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInnerOperatorEnum)[keyof typeof V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInnerOperatorEnum];

export type MonitoringField =
	V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInner & {
		isKeyField?: boolean;
	};

export type MonitoringConfig =
	V4WorkflowsWorkflowIdMetadataPutRequestMonitoring & {
		channels?: Array<unknown>;
	};

export type LocationConfig = WorkflowWithCustomSchemaLocation;
