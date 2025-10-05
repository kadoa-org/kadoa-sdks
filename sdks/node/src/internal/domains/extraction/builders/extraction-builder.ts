import { KadoaSdkException } from "../../../runtime/exceptions";
import type { SchemaField } from "../services/entity-resolver.service";
import type { Category, DataType, FieldOptions, RawFormat } from "./types";

/**
 * Base builder for extraction configuration
 */
export class ExtractionBuilder {
	protected fields: SchemaField[] = [];
	protected schemaName?: string;
	protected schemaId?: string;

	/**
	 * Start defining a custom schema with fields
	 * @param name - The entity name (e.g., "Product", "Article")
	 */
	schema(name: string): SchemaBuilder {
		if (this.schemaId) {
			throw new KadoaSdkException(
				"Cannot use schema() after useSchema() - they are mutually exclusive",
				{ code: "VALIDATION_ERROR" },
			);
		}
		this.schemaName = name;
		return new SchemaBuilder(this);
	}

	/**
	 * Use an existing schema by ID
	 * @param schemaId - The schema ID to reference
	 */
	useSchema(schemaId: string): this {
		if (this.schemaName || this.fields.length > 0) {
			throw new KadoaSdkException(
				"Cannot use useSchema() after schema() or field definitions - they are mutually exclusive",
				{ code: "VALIDATION_ERROR" },
			);
		}
		this.schemaId = schemaId;
		return this;
	}

	/**
	 * Extract raw page content without transformation
	 * @param format - Raw content format(s): "html", "markdown", or "url"
	 */
	raw(format: RawFormat | RawFormat[]): this {
		const formats = Array.isArray(format) ? format : [format];
		const nameMap: Record<RawFormat, string> = {
			html: "rawHtml",
			markdown: "rawMarkdown",
			url: "rawUrl",
		};
		const metadataKeyMap: Record<RawFormat, string> = {
			html: "HTML",
			markdown: "MARKDOWN",
			url: "PAGE_URL",
		};

		for (const f of formats) {
			const fieldName = nameMap[f];
			// Check if field already exists
			if (this.fields.some((field) => field.name === fieldName)) {
				continue; // Skip duplicate
			}

			this.fields.push({
				name: fieldName,
				description: `Raw page content in ${f.toUpperCase()} format`,
				fieldType: "METADATA",
				metadataKey: metadataKeyMap[f] as "HTML" | "MARKDOWN" | "PAGE_URL",
			});
		}
		return this;
	}

	/**
	 * Get the fields array (internal use)
	 */
	getFields(): SchemaField[] {
		return this.fields;
	}

	/**
	 * Get the schema name (internal use)
	 */
	getSchemaName(): string | undefined {
		return this.schemaName;
	}

	/**
	 * Get the schema ID (internal use)
	 */
	getSchemaId(): string | undefined {
		return this.schemaId;
	}
}

/**
 * Builder for defining custom schemas with fields
 */
export class SchemaBuilder extends ExtractionBuilder {
	private static readonly FIELD_NAME_PATTERN = /^[A-Za-z0-9]+$/;
	private static readonly TYPES_REQUIRING_EXAMPLE: DataType[] = [
		"STRING",
		"IMAGE",
		"LINK",
		"OBJECT",
		"ARRAY",
	];

	constructor(parentBuilder: ExtractionBuilder) {
		super();
		// Copy state from parent
		this.fields = parentBuilder.getFields();
		this.schemaName = parentBuilder.getSchemaName();
		this.schemaId = parentBuilder.getSchemaId();
	}

	/**
	 * Add a structured field to the schema
	 * @param name - Field name (alphanumeric only)
	 * @param description - Field description
	 * @param dataType - Data type (STRING, NUMBER, BOOLEAN, etc.)
	 * @param options - Optional field configuration
	 */
	field(
		name: string,
		description: string,
		dataType: DataType,
		options?: FieldOptions,
	): this {
		// Validate field name pattern
		if (!SchemaBuilder.FIELD_NAME_PATTERN.test(name)) {
			throw new KadoaSdkException(
				`Field name "${name}" must be alphanumeric only (no underscores or special characters)`,
				{
					code: "VALIDATION_ERROR",
					details: { name, pattern: "^[A-Za-z0-9]+$" },
				},
			);
		}

		// Check for duplicate names (case-insensitive)
		const lowerName = name.toLowerCase();
		if (this.fields.some((f) => f.name.toLowerCase() === lowerName)) {
			throw new KadoaSdkException(`Duplicate field name: "${name}"`, {
				code: "VALIDATION_ERROR",
				details: { name },
			});
		}

		// Validate example requirement
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
		// Validate field name pattern
		if (!SchemaBuilder.FIELD_NAME_PATTERN.test(name)) {
			throw new KadoaSdkException(
				`Field name "${name}" must be alphanumeric only (no underscores or special characters)`,
				{
					code: "VALIDATION_ERROR",
					details: { name, pattern: "^[A-Za-z0-9]+$" },
				},
			);
		}

		// Check for duplicate names (case-insensitive)
		const lowerName = name.toLowerCase();
		if (this.fields.some((f) => f.name.toLowerCase() === lowerName)) {
			throw new KadoaSdkException(`Duplicate field name: "${name}"`, {
				code: "VALIDATION_ERROR",
				details: { name },
			});
		}

		this.fields.push({
			name,
			description,
			fieldType: "CLASSIFICATION",
			categories,
		});
		return this;
	}

	/**
	 * Add raw page content alongside structured fields
	 * @param format - Raw content format(s): "html", "markdown", or "url"
	 */
	override raw(format: RawFormat | RawFormat[]): this {
		return super.raw(format) as this;
	}
}
