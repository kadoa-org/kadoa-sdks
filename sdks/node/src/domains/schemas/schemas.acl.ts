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
  type ExtractionClassificationFieldCategoriesInner,
  type ExtractionSchemaFieldExample,
  type CreateSchemaBody as GeneratedCreateSchemaBody,
  type SchemaResponse as GeneratedSchemaResponse,
  type UpdateSchemaBody as GeneratedUpdateSchemaBody,
  type SchemaResponseSchemaInner,
  SchemasApi,
} from "../../generated";

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
 * Re-exported from generated ExtractionSchemaFieldExample model.
 */
export type FieldExample = ExtractionSchemaFieldExample;

/**
 * Category definition for classification fields.
 * Re-exported from generated ExtractionClassificationFieldCategoriesInner model.
 */
export type Category = ExtractionClassificationFieldCategoriesInner;
