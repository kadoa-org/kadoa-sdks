/**
 * Extraction domain ACL.
 * Wraps generated WorkflowsApi requests/responses for data fetching operations.
 * Wraps generated schema field types for entity resolution.
 * Downstream code must import from this module instead of `generated/**`.
 */

import type {
  CreateWorkflowWithSchemaBodyIntervalEnum,
  CreateWorkflowWithSchemaBodyNavigationModeEnum,
  ExtractionClassificationField,
  ExtractionClassificationFieldFieldTypeEnum,
  ExtractionMetadataField,
  ExtractionMetadataFieldFieldTypeEnum,
  ExtractionMetadataFieldMetadataKeyEnum,
  ExtractionSchemaField,
  ExtractionSchemaFieldDataTypeEnum,
  ExtractionSchemaFieldFieldTypeEnum,
  Location,
  V4WorkflowsWorkflowIdDataGet200Response,
  V4WorkflowsWorkflowIdDataGet200ResponsePagination,
  V4WorkflowsWorkflowIdDataGetOrderEnum,
  V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInner,
  V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInnerOperatorEnum,
} from "../../generated";
import type {
  GetWorkflowResponse,
  MonitoringConfig,
  WorkflowsApiInterface,
} from "../workflows/workflows.acl";

/**
 * Data pagination metadata.
 */
export type DataPagination = V4WorkflowsWorkflowIdDataGet200ResponsePagination;

/**
 * Workflow data response.
 * Note: This type doesn't contain enum fields that need remapping.
 */
export type WorkflowDataResponse = V4WorkflowsWorkflowIdDataGet200Response;

/**
 * Data sort order enum.
 */
export const DataSortOrder = {
  Asc: "asc",
  Desc: "desc",
} as const satisfies Record<
  keyof typeof V4WorkflowsWorkflowIdDataGetOrderEnum,
  V4WorkflowsWorkflowIdDataGetOrderEnum
>;

export type DataSortOrder = (typeof DataSortOrder)[keyof typeof DataSortOrder];

/**
 * Options for fetching workflow data.
 */
export class FetchDataOptions {
  workflowId!: string;
  runId?: string;
  sortBy?: string;
  order?: DataSortOrder;
  filters?: string;
  page?: number;
  limit?: number;
  includeAnomalies?: boolean;
}

/**
 * Schema field data type enum.
 */
export const SchemaFieldDataType = {
  Text: "TEXT",
  Number: "NUMBER",
  Date: "DATE",
  Url: "URL",
  Email: "EMAIL",
  Image: "IMAGE",
  Video: "VIDEO",
  Phone: "PHONE",
  Boolean: "BOOLEAN",
  Location: "LOCATION",
  Array: "ARRAY",
  Object: "OBJECT",
} as const satisfies Record<string, string>;

export type SchemaFieldDataType =
  (typeof SchemaFieldDataType)[keyof typeof SchemaFieldDataType];

export type SchemaField =
  | ExtractionSchemaField
  | ExtractionClassificationField
  | ExtractionMetadataField;

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

export type WorkflowMonitoringConfig = MonitoringConfig;

/**
 * Workflow details response.
 * Re-exported from workflows.acl.ts to get SDK-curated enum types.
 */
export type WorkflowDetailsResponse = GetWorkflowResponse;

export type { WorkflowsApiInterface };
