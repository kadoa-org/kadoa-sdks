import { camelCase, upperFirst } from "es-toolkit";
import { KadoaSdkException } from "../../runtime/exceptions";
import type { DataType, RawFormat } from "../extraction/extraction.acl";
import type { Category, FieldExample, SchemaField } from "./schemas.acl";

export type { FieldExample, Category };

/**
 * Data types that require an example value
 */
export type DataTypeRequiringExample =
  | "STRING"
  | "IMAGE"
  | "LINK"
  | "OBJECT"
  | "ARRAY";

/**
 * Data types that do not require an example value
 */
export type DataTypeNotRequiringExample =
  | "NUMBER"
  | "BOOLEAN"
  | "DATE"
  | "DATETIME"
  | "MONEY";

/**
 * Field options when example is required
 */
export interface FieldOptionsWithExample {
  /**
   * Example value for the field (required)
   */
  example: FieldExample;
  /**
   * Whether this field is a primary key
   */
  isKey?: boolean;
}

/**
 * Field options when example is optional
 */
export interface FieldOptionsWithoutExample {
  /**
   * Example value for the field (optional)
   */
  example?: FieldExample;
  /**
   * Whether this field is a primary key
   */
  isKey?: boolean;
}

/**
 * Optional configuration for schema fields
 */
export interface FieldOptions {
  /**
   * Example value for the field (required for STRING, IMAGE, LINK, OBJECT, ARRAY)
   * Can be a string or an array of strings
   */
  example?: FieldExample;
  /**
   * Whether this field is a primary key
   */
  isKey?: boolean;
}

/**
 * Builder for defining custom schemas with fields
 */
export class SchemaBuilder {
  private static readonly FIELD_NAME_PATTERN = /^[A-Za-z0-9]+$/;
  private static readonly TYPES_REQUIRING_EXAMPLE: DataType[] = [
    "STRING",
    "IMAGE",
    "LINK",
    "OBJECT",
    "ARRAY",
  ];

  readonly fields: SchemaField[] = [];
  entityName?: string;

  private hasSchemaFields(): boolean {
    return this.fields.some((field) => field.fieldType === "SCHEMA");
  }

  entity(entityName: string): this {
    this.entityName = entityName;
    return this;
  }

  /**
   * Add a structured field to the schema
   * @param name - Field name (alphanumeric only)
   * @param description - Field description
   * @param dataType - Data type (STRING, NUMBER, BOOLEAN, etc.)
   * @param options - Field configuration (example required for STRING, IMAGE, LINK, OBJECT, ARRAY)
   */
  field<T extends DataTypeRequiringExample>(
    name: string,
    description: string,
    dataType: T,
    options: FieldOptionsWithExample,
  ): this;
  /**
   * Add a structured field to the schema
   * @param name - Field name (alphanumeric only)
   * @param description - Field description
   * @param dataType - Data type (STRING, NUMBER, BOOLEAN, etc.)
   * @param options - Optional field configuration
   */
  field<T extends DataTypeNotRequiringExample>(
    name: string,
    description: string,
    dataType: T,
    options?: FieldOptionsWithoutExample,
  ): this;
  field(
    name: string,
    description: string,
    dataType: DataType,
    options?: FieldOptions,
  ): this {
    this.validateFieldName(name);

    const requiresExample =
      SchemaBuilder.TYPES_REQUIRING_EXAMPLE.includes(dataType);
    if (requiresExample && !options?.example) {
      throw new KadoaSdkException(
        `Field "${name}" with type ${dataType} requires an example`,
        { code: "VALIDATION_ERROR", details: { name, dataType } },
      );
    }

    this.fields.push({
      name,
      description,
      dataType,
      fieldType: "SCHEMA",
      example: options?.example,
      isKey: options?.isKey,
    });
    return this;
  }

  /**
   * Add a classification field to categorize content
   * @param name - Field name (alphanumeric only)
   * @param description - Field description
   * @param categories - Array of category definitions
   */
  classify(name: string, description: string, categories: Category[]): this {
    this.validateFieldName(name);

    this.fields.push({
      name,
      description,
      fieldType: "CLASSIFICATION",
      categories,
    });
    return this;
  }

  /**
   * Add raw page content to extract
   * @param name - Raw content format(s): "html", "markdown", or "url"
   */
  raw(name: RawFormat | RawFormat[]): this {
    const names = Array.isArray(name) ? name : [name];

    for (const name of names) {
      const fieldName = `raw${upperFirst(camelCase(name))}`;

      if (this.fields.some((field) => field.name === fieldName)) {
        continue;
      }

      this.fields.push({
        name: fieldName,
        description: `Raw page content in ${name.toUpperCase()} format`,
        fieldType: "METADATA",
        metadataKey: name,
      });
    }
    return this;
  }

  build(): { entityName?: string; fields: SchemaField[] } {
    if (this.hasSchemaFields() && !this.entityName) {
      throw new KadoaSdkException(
        "Entity name is required when schema fields are present",
        {
          code: "VALIDATION_ERROR",
          details: { entityName: this.entityName },
        },
      );
    }

    return {
      entityName: this.entityName,
      fields: this.fields,
    };
  }

  private validateFieldName(name: string) {
    if (!SchemaBuilder.FIELD_NAME_PATTERN.test(name)) {
      throw new KadoaSdkException(
        `Field name "${name}" must be alphanumeric only (no underscores or special characters)`,
        {
          code: "VALIDATION_ERROR",
          details: { name, pattern: "^[A-Za-z0-9]+$" },
        },
      );
    }

    const lowerName = name.toLowerCase();
    if (this.fields.some((f) => f.name.toLowerCase() === lowerName)) {
      throw new KadoaSdkException(`Duplicate field name: "${name}"`, {
        code: "VALIDATION_ERROR",
        details: { name },
      });
    }
  }
}
