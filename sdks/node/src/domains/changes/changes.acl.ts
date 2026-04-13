/**
 * Changes domain ACL.
 * Wraps generated WorkflowsApi change endpoints and normalizes types.
 * Downstream code must import from this module instead of `generated/**`.
 */

import type {
  V4ChangesGet200Response,
  V4ChangesGet200ResponseChangesInner,
  V4ChangesGet200ResponseChangesInnerDifferencesInner,
  V4ChangesGet200ResponseChangesInnerDifferencesInnerFieldsInner,
  V4ChangesGet200ResponsePagination,
  WorkflowsApiV4ChangesGetRequest,
} from "../../generated";

// ========================================
// TYPE ALIASES
// ========================================

/** A single change event detected by the monitoring system. */
export interface Change {
  /** Unique identifier of the change */
  id?: string;
  /** ID of the workflow this change belongs to */
  workflowId?: string;
  /** Current state of the data after the change */
  data?: Array<object>;
  /** Structured representation of changes with object-based diffing */
  differences?: ChangeDifference[];
  /** URL where the change was detected */
  url?: string;
  /** AI-generated one-sentence summary. Null if generation failed or feature disabled. */
  summary?: string | null;
  /** URL of the screenshot taken when the change was detected */
  screenshotUrl?: string;
  /** Timestamp when the change was created */
  createdAt?: string;
}

/** A single diff entry: added, removed, or changed records. */
export interface ChangeDifference {
  /** Type of change */
  type?: ChangeDifferenceType;
  /** List of field changes */
  fields?: ChangeDifferenceField[];
}

export const ChangeDifferenceType = {
  Added: "added",
  Removed: "removed",
  Changed: "changed",
} as const;

export type ChangeDifferenceType =
  (typeof ChangeDifferenceType)[keyof typeof ChangeDifferenceType];

/** A single field-level change within a diff entry. */
export interface ChangeDifferenceField {
  /** Field name */
  key?: string;
  /** Current field value */
  value?: string;
  /** Previous field value (only present for 'changed' type) */
  previousValue?: string;
}

export type ChangesPagination = V4ChangesGet200ResponsePagination;

// ========================================
// REQUEST / RESPONSE OPTIONS
// ========================================

/**
 * Options for listing changes.
 * Auth fields (xApiKey, authorization) are handled by the SDK interceptor
 * and intentionally excluded from this class.
 */
export class ListChangesOptions
  implements Omit<WorkflowsApiV4ChangesGetRequest, "xApiKey" | "authorization">
{
  workflowIds?: string;
  startDate?: string;
  endDate?: string;
  skip?: number;
  limit?: number;
  exclude?: string;
}

export interface ListChangesResult {
  changes: Change[];
  pagination?: ChangesPagination;
  changesCount: number;
}

// ========================================
// MAPPERS (generated → domain)
// ========================================

export function mapChange(raw: V4ChangesGet200ResponseChangesInner): Change {
  return {
    id: raw.id,
    workflowId: raw.workflowId,
    data: raw.data,
    differences: coalesceDifferences(raw.differences),
    url: raw.url,
    summary: raw.summary,
    screenshotUrl: raw.screenshotUrl,
    createdAt: raw.createdAt,
  };
}

/**
 * The API emits row updates as separate `added` + `removed` diffs that share
 * the same row identity (rowRef.currentRowId === rowRef.previousRowId). We
 * coalesce those pairs into a single `changed` diff so consumers see clean
 * `previousValue → value` semantics. Unpaired added/removed entries (true
 * inserts/deletes) pass through untouched.
 *
 * NOTE: `rowRef` is present on the wire but missing from the OpenAPI spec,
 * so we read it via a local cast. Remove the cast once the spec is updated.
 */
function coalesceDifferences(
  raw: V4ChangesGet200ResponseChangesInner["differences"],
): ChangeDifference[] | undefined {
  if (!raw) return undefined;

  type RawDiffWithRef = V4ChangesGet200ResponseChangesInnerDifferencesInner & {
    rowRef?: { currentRowId?: string; previousRowId?: string };
  };

  const addedByRow = new Map<string, RawDiffWithRef>();
  const removedByRow = new Map<string, RawDiffWithRef>();
  const passthrough: RawDiffWithRef[] = [];

  for (const diff of raw as RawDiffWithRef[]) {
    if (diff.type === "added" && diff.rowRef?.currentRowId) {
      addedByRow.set(diff.rowRef.currentRowId, diff);
    } else if (diff.type === "removed" && diff.rowRef?.previousRowId) {
      removedByRow.set(diff.rowRef.previousRowId, diff);
    } else {
      passthrough.push(diff);
    }
  }

  const result: ChangeDifference[] = [];

  for (const [rowId, added] of addedByRow) {
    const removed = removedByRow.get(rowId);
    if (removed) {
      removedByRow.delete(rowId);
      result.push(mergeAddedRemoved(added, removed));
    } else {
      result.push(mapDifference(added));
    }
  }

  for (const removed of removedByRow.values()) {
    result.push(mapDifference(removed));
  }

  for (const diff of passthrough) {
    result.push(mapDifference(diff));
  }

  return result;
}

function mergeAddedRemoved(
  added: V4ChangesGet200ResponseChangesInnerDifferencesInner,
  removed: V4ChangesGet200ResponseChangesInnerDifferencesInner,
): ChangeDifference {
  const previousByKey = new Map<string, string | undefined>();
  for (const f of removed.fields ?? []) {
    if (f.key !== undefined) previousByKey.set(f.key, f.value);
  }

  const fields: ChangeDifferenceField[] = (added.fields ?? []).map((f) => ({
    key: f.key,
    value: f.value,
    previousValue: f.key !== undefined ? previousByKey.get(f.key) : undefined,
  }));

  // Surface any removed-only keys (rare, but possible if shapes differ).
  const addedKeys = new Set((added.fields ?? []).map((f) => f.key));
  for (const f of removed.fields ?? []) {
    if (!addedKeys.has(f.key)) {
      fields.push({ key: f.key, value: undefined, previousValue: f.value });
    }
  }

  return { type: ChangeDifferenceType.Changed, fields };
}

function mapDifference(
  raw: V4ChangesGet200ResponseChangesInnerDifferencesInner,
): ChangeDifference {
  return {
    type: raw.type as ChangeDifferenceType,
    fields: raw.fields?.map(mapField),
  };
}

function mapField(
  raw: V4ChangesGet200ResponseChangesInnerDifferencesInnerFieldsInner,
): ChangeDifferenceField {
  return {
    key: raw.key,
    value: raw.value,
    previousValue: raw.previousValue,
  };
}

/** Maps the raw v4ChangesGet response to the curated ListChangesResult. Deliberately drops `timestamp`. */
export function mapListChangesResponse(
  raw: V4ChangesGet200Response,
): ListChangesResult {
  return {
    changes: (raw.changes ?? []).map(mapChange),
    pagination: raw.pagination,
    changesCount: raw.changesCount ?? 0,
  };
}
