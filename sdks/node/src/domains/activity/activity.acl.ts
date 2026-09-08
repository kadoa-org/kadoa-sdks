/**
 * Activity domain ACL.
 * Wraps the generated ActivityApi request/response for GET /v4/activity.
 * Downstream code must import from this module instead of `generated/**`.
 */

import type {
  ActivityApiV4ActivityGetRequest,
  ActivityListResponse,
  ActivityEvent as GeneratedActivityEvent,
} from "../../generated";

// ========================================
// TYPES
// ========================================

/** Who triggered an activity event and from which channel. */
export interface ActivityEventSource {
  /** Request channel that produced the event (UI, API, SDK, MCP, SYSTEM, ...). Free-form; new labels appear without an SDK release. */
  requestSource?: string;
  /** User id, absent for SYSTEM and support-originated events. */
  userId?: string;
  /** User email when the backend could resolve it. */
  userEmail?: string;
}

/** The record an activity event is about. */
export interface ActivityEventResource {
  /** Resource type (WORKFLOW, WORKFLOW_RUN, SCHEMA, NOTIFICATION_CHANNEL, TEMPLATE, VARIABLE, TEAM_MEMBER, ...). */
  type: string;
  workflowId?: string;
  resourceId?: string;
  /** Human-readable resource name (workflow name, channel name, ...). */
  name?: string;
}

/** One row of the team Activity log. */
export interface ActivityEvent {
  /** Event title such as CREATED, UPDATED, DELETED, APPROVED, FINISHED, FAILED, DATA_CHANGED. */
  title: string;
  /** ISO 8601 timestamp. */
  dateTime: string;
  source?: ActivityEventSource;
  resource?: ActivityEventResource;
  /** Sanitized before/after snapshots and a `_changeSummary` string when available. */
  details?: Record<string, unknown>;
}

export interface ActivityPagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ========================================
// REQUEST / RESPONSE OPTIONS
// ========================================

/**
 * Filters for listing team activity. All fields optional.
 * `eventTypes`, `interfaces`, `resourceTypes` are comma-separated strings, exactly as the API accepts them.
 */
export class ListActivityOptions implements ActivityApiV4ActivityGetRequest {
  /** 1..1000, API default 25. */
  limit?: number;
  offset?: number;
  workflowId?: string;
  userId?: string;
  /** ISO 8601. Ignored when `relativeTime` is set. */
  startDate?: string;
  /** ISO 8601. Ignored when `relativeTime` is set. */
  endDate?: string;
  /** Window counted back from now, e.g. "30m", "6h", "1d", "2w". */
  relativeTime?: string;
  eventTypes?: string;
  interfaces?: string;
  resourceTypes?: string;
}

export interface ListActivityResult {
  events: ActivityEvent[];
  pagination: ActivityPagination;
}

// ========================================
// MAPPERS (generated -> domain)
// ========================================

export function mapActivityEvent(raw: GeneratedActivityEvent): ActivityEvent {
  return {
    title: raw.title,
    dateTime: raw.dateTime,
    source: raw.source
      ? {
          requestSource: raw.source.requestSource,
          userId: raw.source.userId,
          userEmail: raw.source.userEmail,
        }
      : undefined,
    resource: raw.resource
      ? {
          type: raw.resource.type,
          workflowId: raw.resource.workflowId,
          resourceId: raw.resource.resourceId,
          name: raw.resource.name,
        }
      : undefined,
    details: raw.details as Record<string, unknown> | undefined,
  };
}

export function mapListActivityResponse(
  raw: ActivityListResponse,
): ListActivityResult {
  return {
    events: (raw.data.events ?? []).map(mapActivityEvent),
    pagination: {
      total: raw.data.pagination.total,
      limit: raw.data.pagination.limit,
      offset: raw.data.pagination.offset,
      hasMore: raw.data.pagination.hasMore,
    },
  };
}
