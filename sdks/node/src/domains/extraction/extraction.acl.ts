/**
 * Extraction domain ACL.
 * Wraps generated WorkflowsApi requests/responses for data fetching operations.
 * Wraps generated schema field types for entity resolution.
 * Downstream code must import from this module instead of `generated/**`.
 */

import type {
  ClassificationField,
  ClassificationFieldFieldTypeEnum,
  DataField,
  DataFieldFieldTypeEnum,
  Location,
  RawContentField,
  RawContentFieldFieldTypeEnum,
  RawContentFieldMetadataKeyEnum,
  V4WorkflowsWorkflowIdDataGet200Response,
  V4WorkflowsWorkflowIdDataGet200ResponsePagination,
  V4WorkflowsWorkflowIdDataGetOrderEnum,
  V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInner,
  V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInnerOperatorEnum,
  WorkflowWithExistingSchemaIntervalEnum,
  WorkflowWithExistingSchemaNavigationModeEnum,
} from "../../generated";
import { DataFieldDataTypeEnum } from "../../generated";
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
 * Canonical entries align with the generated `DataFieldDataTypeEnum` values.
 */
const CanonicalSchemaFieldDataType = {
  String: DataFieldDataTypeEnum.String,
  Number: DataFieldDataTypeEnum.Number,
  Boolean: DataFieldDataTypeEnum.Boolean,
  Date: DataFieldDataTypeEnum.Date,
  Datetime: DataFieldDataTypeEnum.Datetime,
  Money: DataFieldDataTypeEnum.Money,
  Image: DataFieldDataTypeEnum.Image,
  Link: DataFieldDataTypeEnum.Link,
  Object: DataFieldDataTypeEnum.Object,
  Array: DataFieldDataTypeEnum.Array,
} as const satisfies Record<
  keyof typeof DataFieldDataTypeEnum,
  DataFieldDataTypeEnum
>;

/**
 * Curated field data type enum exposed by the SDK.
 * Includes aliases for the legacy TEXT/URL identifiers for backwards compatibility.
 */
export const SchemaFieldDataType = {
  ...CanonicalSchemaFieldDataType,
  /** @deprecated use `SchemaFieldDataType.String` */
  Text: DataFieldDataTypeEnum.String,
  /** @deprecated use `SchemaFieldDataType.Link` */
  Url: DataFieldDataTypeEnum.Link,
} as const satisfies Record<string, DataFieldDataTypeEnum>;

export type SchemaFieldDataType =
  (typeof SchemaFieldDataType)[keyof typeof SchemaFieldDataType];

export type SchemaField = DataField | ClassificationField | RawContentField;

export type NavigationMode =
  (typeof WorkflowWithExistingSchemaNavigationModeEnum)[keyof typeof WorkflowWithExistingSchemaNavigationModeEnum];

export type DataTypeInternal =
  (typeof DataFieldDataTypeEnum)[keyof typeof DataFieldDataTypeEnum];

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
  (typeof RawContentFieldMetadataKeyEnum)[keyof typeof RawContentFieldMetadataKeyEnum];

export type WorkflowInterval =
  (typeof WorkflowWithExistingSchemaIntervalEnum)[keyof typeof WorkflowWithExistingSchemaIntervalEnum];

export type MonitoringOperator =
  (typeof V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInnerOperatorEnum)[keyof typeof V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInnerOperatorEnum];

export type MonitoringField =
  V4WorkflowsWorkflowIdMetadataPutRequestMonitoringFieldsInner & {
    isKeyField?: boolean;
  };

export type LocationConfig = Location;

export type RawFormat =
  (typeof RawContentFieldMetadataKeyEnum)[keyof typeof RawContentFieldMetadataKeyEnum];

export type FieldType =
  | RawContentFieldFieldTypeEnum
  | ClassificationFieldFieldTypeEnum
  | DataFieldFieldTypeEnum;

export type WorkflowMonitoringConfig = MonitoringConfig;

/**
 * Workflow details response.
 * Re-exported from workflows.acl.ts to get SDK-curated enum types.
 */
export type WorkflowDetailsResponse = GetWorkflowResponse;

export type { WorkflowsApiInterface };
