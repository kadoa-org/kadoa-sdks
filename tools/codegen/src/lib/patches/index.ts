import { patchDataTypeEnumValidator } from "./data-type-enum";
import { patchNotificationChannelConfigDeserialization } from "./notification-channel-config";
import { patchWorkflowDisplayStateEnum } from "./workflow-display-state-enum";
import { patchWorkflowEntityField } from "./workflow-entity-field";

/**
 * Type for a patcher function that modifies generated OpenAPI client code.
 */
export type Patcher = (openapiClientDir: string) => void;

/**
 * All available patchers for Python OpenAPI client generation.
 */
const PYTHON_PATCHERS: Patcher[] = [
  patchNotificationChannelConfigDeserialization,
  patchDataTypeEnumValidator,
  patchWorkflowEntityField,
  patchWorkflowDisplayStateEnum,
];

/**
 * Applies all patches to the generated OpenAPI client.
 *
 * @param openapiClientDir - Path to the generated openapi_client directory
 */
export function applyAllPatches(openapiClientDir: string): void {
  for (const patcher of PYTHON_PATCHERS) {
    patcher(openapiClientDir);
  }
}

export { patchDataTypeEnumValidator } from "./data-type-enum";
// Export individual patchers for potential direct use
export { patchNotificationChannelConfigDeserialization } from "./notification-channel-config";
export { patchWorkflowDisplayStateEnum } from "./workflow-display-state-enum";
export { patchWorkflowEntityField } from "./workflow-entity-field";
