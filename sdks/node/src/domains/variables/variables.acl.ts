/**
 * Variables domain ACL.
 * Wraps generated VariablesApi requests/responses and normalizes types.
 * Downstream code must import from this module instead of `generated/**`.
 */

import {
  type CreateVariableBody as GeneratedCreateVariableBody,
  type UpdateVariableBody as GeneratedUpdateVariableBody,
  type Variable as GeneratedVariable,
  VariablesApi,
} from "../../generated";

// ========================================
// API Client
// ========================================

export { VariablesApi };

// ========================================
// Request Types
// ========================================

export type CreateVariableRequest = GeneratedCreateVariableBody;

export type UpdateVariableRequest = GeneratedUpdateVariableBody;

// ========================================
// Response Types
// ========================================

export type Variable = GeneratedVariable;
