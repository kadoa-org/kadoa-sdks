import fs from "node:fs";
import path from "node:path";

/**
 * Patches the entity field deserialization to handle string values.
 *
 * Fixes the entity field in V4WorkflowsWorkflowIdGet200Response.from_dict() to handle
 * cases where the backend returns entity as a string (e.g., 'JobPosting') instead of
 * an object as specified in the OpenAPI spec.
 */
export function patchWorkflowEntityField(openapiClientDir: string): void {
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
  if (content.includes("# Handle string entity values from backend")) {
    console.log(
      `✅ Workflow entity field already patched in ${path.basename(responsePath)}`,
    );
    return;
  }

  // Find the entity field assignment in from_dict method
  // Look for: "entity": obj.get("entity"),
  const entityPattern = /("entity":\s*)obj\.get\("entity"\)/;
  const match = content.match(entityPattern);

  if (match) {
    // Replace with patched version that handles string values
    const patchedEntity = `$1{"name": obj.get("entity")} if isinstance(obj.get("entity"), str) else obj.get("entity"),  # Handle string entity values from backend`;
    content = content.replace(entityPattern, patchedEntity);
    fs.writeFileSync(responsePath, content, "utf-8");
    console.log(
      `✅ Patched workflow entity field in ${path.basename(responsePath)}`,
    );
    return;
  }

  console.warn(`⚠️  Could not find entity field assignment in ${responsePath}`);
}
