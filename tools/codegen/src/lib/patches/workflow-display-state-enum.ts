import fs from "node:fs";
import path from "node:path";

/**
 * Patches the displayState enum validator to handle 'DELETED' value.
 *
 * Fixes the display_state_validate_enum method in V4WorkflowsWorkflowIdGet200Response
 * to accept 'DELETED' value that the backend returns but isn't in the OpenAPI spec enum.
 */
export function patchWorkflowDisplayStateEnum(openapiClientDir: string): void {
  const responsePath = path.join(
    openapiClientDir,
    "models",
    "v4_workflows_workflow_id_get200_response.py",
  );

  if (!fs.existsSync(responsePath)) {
    console.warn(
      `⚠️  Workflow response file not found at ${responsePath}, skipping patch`,
    );
    return;
  }

  let content = fs.readFileSync(responsePath, "utf-8");

  // Check if already patched
  if (content.includes("'DELETED'")) {
    console.log(
      `✅ Workflow displayState enum validator already patched in ${path.basename(responsePath)}`,
    );
    return;
  }

  // Try regex-based replacement for flexible matching
  const validatorRegex =
    /(@field_validator\('display_state'\)\s+def display_state_validate_enum\(cls, value\):[\s\S]*?return value)/;
  const match = content.match(validatorRegex);
  if (match) {
    // Check if it's the old version (doesn't handle DELETED)
    const methodBody = match[1];
    if (
      methodBody.includes("raise ValueError") &&
      !methodBody.includes("DELETED")
    ) {
      // Find the valid values set and add DELETED
      const updatedMethodBody = methodBody.replace(
        /set\(\[(.*?)\]\)/s,
        (match, values) => {
          // Add DELETED after RUNNING
          if (values.includes("'RUNNING'")) {
            return `set([${values.trim().replace(/'RUNNING'/, "'RUNNING', 'DELETED'")}])`;
          }
          return match;
        },
      );

      // Update the error message to include DELETED
      const updatedMethodBodyWithError = updatedMethodBody.replace(
        /raise ValueError\("must be one of enum values \((.*?)\)"\)/,
        (match, errorValues) => {
          return `raise ValueError("must be one of enum values (${errorValues}, 'DELETED')")`;
        },
      );

      // Replace the validator - preserve indentation
      const indentMatch = content.match(
        /(\s+)@field_validator\('display_state'\)/,
      );
      const baseIndent = indentMatch ? indentMatch[1] : "    ";

      // Adjust indentation to match file
      const adjustedMethodBody = updatedMethodBodyWithError.replace(
        /^/gm,
        baseIndent,
      );

      content = content.replace(validatorRegex, adjustedMethodBody);
      fs.writeFileSync(responsePath, content, "utf-8");
      console.log(
        `✅ Patched workflow displayState enum validator in ${path.basename(responsePath)}`,
      );
      return;
    }
  }

  console.warn(
    `⚠️  Could not find or patch display_state_validate_enum method in ${responsePath}`,
  );
}
