/**
 * Schemas domain ACL.
 * Wraps generated SchemasApi requests/responses and normalizes types.
 * Downstream code must import from this module instead of `generated/**`.
 *
 * NOTE: This ACL uses type aliases instead of explicit classes/interfaces because:
 * - The generated types (CreateSchemaBody, UpdateSchemaBody, SchemaResponse) are flat interfaces
 * - They contain only primitive fields and simple nested types (SchemaResponseSchemaInner)
 * - No enums or complex nested structures that could leak implementation details
 * - The types are stable and unlikely to change in structure
 */

import {
  type ClassificationFieldCategoriesInner,
  type DataField,
  type DataFieldExample,
  type CreateSchemaBody as GeneratedCreateSchemaBody,
  type SchemaResponse as GeneratedSchemaResponse,
  type UpdateSchemaBody as GeneratedUpdateSchemaBody,
  type SchemaResponseSchemaInner,
  SchemasApi,
} from "../../generated";
import type { DataType } from "../extraction/extraction.acl";
import type {
  DataTypeRequiringExample,
  DataTypeNotRequiringExample,
} from "./schema-builder";

// ========================================
// API Client
// ========================================

export { SchemasApi };

// ========================================
// Request Types
// ========================================

/**
 * Request to create a new schema.
 * Re-exported from generated CreateSchemaBody model with JSDoc preserved.
 */
export type CreateSchemaRequest = GeneratedCreateSchemaBody;

/**
 * Request to update an existing schema.
 * Re-exported from generated UpdateSchemaBody model with JSDoc preserved.
 */
export type UpdateSchemaRequest = GeneratedUpdateSchemaBody;

// ========================================
// Response Types
// ========================================

/**
 * Schema response data.
 * Re-exported from generated SchemaResponse model with JSDoc preserved.
 */
export type SchemaResponse = GeneratedSchemaResponse;

/**
 * Schema field definition.
 * Re-exported from generated SchemaResponseSchemaInner model.
 */
export type SchemaField = SchemaResponseSchemaInner;

// ========================================
// Schema Builder Types
// ========================================

/**
 * Example value for a field.
 * Re-exported from generated DataFieldExample model.
 */
export type FieldExample = DataFieldExample;

/**
 * Category definition for classification fields.
 * Re-exported from generated ClassificationFieldCategoriesInner model.
 */
export type Category = ClassificationFieldCategoriesInner;

// ========================================
// Type-Safe Field Construction
// ========================================

/**
 * Type-safe DataField with conditional example requirement.
 * - example is required for STRING, IMAGE, LINK, OBJECT, ARRAY
 * - example is optional for NUMBER, BOOLEAN, DATE, DATETIME, MONEY
 */
export type DataFieldFor<T extends DataType> = T extends DataTypeRequiringExample
  ? Omit<DataField, "example" | "dataType"> & {
      dataType: T;
      example: DataFieldExample;
    }
  : T extends DataTypeNotRequiringExample
    ? Omit<DataField, "example" | "dataType"> & {
        dataType: T;
        example?: DataFieldExample;
      }
    : never;
