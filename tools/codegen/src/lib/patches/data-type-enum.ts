import fs from "node:fs";
import path from "node:path";

/**
 * Patches the dataType enum validator to normalize invalid enum values.
 *
 * Fixes the data_type_validate_enum method in DataField to normalize invalid enum values
 * (e.g., 'JOB_DESCRIPTION') to 'OBJECT' instead of raising an error.
 */
export function patchDataTypeEnumValidator(openapiClientDir: string): void {
  const dataFieldPath = path.join(openapiClientDir, "models", "data_field.py");

  if (!fs.existsSync(dataFieldPath)) {
    console.warn(
      `⚠️  DataField file not found at ${dataFieldPath}, skipping patch`,
    );
    return;
  }

  let content = fs.readFileSync(dataFieldPath, "utf-8");

  // Check if already patched (contains normalization logic)
  if (content.includes("# Normalize invalid enum values to 'OBJECT'")) {
    console.log(
      `✅ DataType enum validator already patched in ${path.basename(dataFieldPath)}`,
    );
    return;
  }

  // Old validator that raises ValueError
  const oldValidator = `    @field_validator('data_type')
    def data_type_validate_enum(cls, value):
        """Validates the enum"""
        if value not in set(['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'DATETIME', 'MONEY', 'IMAGE', 'LINK', 'OBJECT', 'ARRAY']):
            raise ValueError("must be one of enum values ('STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'DATETIME', 'MONEY', 'IMAGE', 'LINK', 'OBJECT', 'ARRAY')")
        return value`;

  // New validator that normalizes invalid values to 'OBJECT'
  const newValidator = `    @field_validator('data_type')
    def data_type_validate_enum(cls, value):
        """Validates the enum"""
        # Normalize invalid enum values to 'OBJECT' instead of raising an error
        # This handles backend-specific values like 'JOB_DESCRIPTION' that aren't in the enum
        valid_values = {'STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'DATETIME', 'MONEY', 'IMAGE', 'LINK', 'OBJECT', 'ARRAY'}
        if value not in valid_values:
            return 'OBJECT'
        return value`;

  // Try exact string match first
  if (content.includes(oldValidator)) {
    content = content.replace(oldValidator, newValidator);
    fs.writeFileSync(dataFieldPath, content, "utf-8");
    console.log(
      `✅ Patched dataType enum validator in ${path.basename(dataFieldPath)}`,
    );
    return;
  }

  // Try regex-based replacement for more flexible matching
  const validatorRegex =
    /(@field_validator\('data_type'\)\s+def data_type_validate_enum\(cls, value\):[\s\S]*?return value)/;
  const match = content.match(validatorRegex);
  if (match) {
    // Check if it's the old version (raises ValueError)
    const methodBody = match[1];
    if (methodBody.includes("raise ValueError")) {
      // Replace with new version - preserve the exact indentation from the file
      const indentMatch = content.match(/(\s+)@field_validator\('data_type'\)/);
      const baseIndent = indentMatch ? indentMatch[1] : "    ";
      // Adjust new validator indentation to match file's indentation
      const adjustedNewValidator = newValidator.replace(/^\s{4}/gm, baseIndent);
      content = content.replace(validatorRegex, adjustedNewValidator);
      fs.writeFileSync(dataFieldPath, content, "utf-8");
      console.log(
        `✅ Patched dataType enum validator (regex match) in ${path.basename(dataFieldPath)}`,
      );
      return;
    }
  }

  console.warn(
    `⚠️  Could not find or patch data_type_validate_enum method in ${dataFieldPath}`,
  );
}
