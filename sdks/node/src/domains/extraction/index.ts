/**
 * Extraction domain exports.
 * Public boundary for data extraction functionality.
 */

// ACL types (owned by extraction.acl.ts)
export type {
  DataPagination,
  DataSortOrder,
  DataType,
  FieldType,
  LocationConfig,
  MetadataKey,
  MonitoringField,
  MonitoringOperator,
  NavigationMode,
  RawFormat,
  SchemaField,
  WorkflowDataResponse,
  WorkflowDetailsResponse,
  WorkflowInterval,
  WorkflowMonitoringConfig,
} from "./extraction.acl";
export { FetchDataOptions, SchemaFieldDataType } from "./extraction.acl";

// Data fetcher types and service (owned by data-fetcher.service.ts)
export type { FetchDataResult } from "./services/data-fetcher.service";
export { DataFetcherService } from "./services/data-fetcher.service";
// Entity resolver service
export { EntityResolverService } from "./services/entity-resolver.service";
// Extraction service types and class (owned by extraction.service.ts)
export type {
  ExtractionOptions,
  ExtractionResult,
  SubmitExtractionResult,
} from "./services/extraction.service";
export { ExtractionService } from "./services/extraction.service";
// Extraction builder types and class (owned by extraction-builder.service.ts)
export type {
  CreatedExtraction,
  ExtractOptions,
  FinishedExtraction,
  PreparedExtraction,
  SubmittedExtraction,
  WaitForReadyOptions,
} from "./services/extraction-builder.service";
export { ExtractionBuilderService } from "./services/extraction-builder.service";
