import type {
	WorkflowWithCustomSchemaFieldsInnerDataTypeEnum,
	WorkflowWithCustomSchemaIntervalEnum,
} from "../../../generated";
import type { V4WorkflowsWorkflowIdMetadataPutRequestMonitoring } from "../../../generated/models/v4-workflows-workflow-id-metadata-put-request-monitoring";
import type {
	V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInner,
	V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInnerOperatorEnum,
} from "../../../generated/models/v4-workflows-workflow-id-metadata-put-request-monitoring-fields-inner";
import type { WorkflowWithExistingSchemaNavigationModeEnum } from "../../../generated/models/workflow-with-existing-schema";

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
