/**
 * Schemas domain exports.
 * Public boundary for schema management functionality.
 */

// Schema builder types and class (owned by schema-builder.ts)
export type { FieldOptions } from "./schema-builder";
export { SchemaBuilder } from "./schema-builder";
// ACL types (owned by schemas.acl.ts)
export type {
  Category,
  CreateSchemaRequest,
  FieldExample,
  SchemaField as SchemaDefinitionField,
  SchemaResponse,
  UpdateSchemaRequest,
} from "./schemas.acl";

// Service class
export { SchemasService } from "./schemas.service";
