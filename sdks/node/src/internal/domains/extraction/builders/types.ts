import type {
	ExtractionClassificationFieldCategoriesInner,
	ExtractionSchemaFieldDataTypeEnum,
	ExtractionSchemaFieldExample,
} from "../../../../generated";

/**
 * Raw content format options
 */
export type RawFormat = "html" | "markdown" | "url";

/**
 * Data type for schema fields
 */
export type DataType =
	(typeof ExtractionSchemaFieldDataTypeEnum)[keyof typeof ExtractionSchemaFieldDataTypeEnum];

/**
 * Optional configuration for schema fields
 */
export interface FieldOptions {
	/**
	 * Example value for the field (required for STRING, IMAGE, LINK, OBJECT, ARRAY)
	 * Can be a string or an array of strings
	 */
	example?: ExtractionSchemaFieldExample;
	/**
	 * Whether this field is a primary key
	 */
	isKey?: boolean;
}

/**
 * Category definition for classification fields
 */
export type Category = ExtractionClassificationFieldCategoriesInner;
