## OpenAPI Spec Update

This PR updates `specs/openapi.json` and `specs/openapi-metadata.json` with the latest version from `https://api.kadoa.com/openapi`.

## Summary

Added two new activity endpoints for audit log retrieval and CSV export, removed workflow-related features (`channelCounts`, `userId` filter, `DELETED` state), and modified activity list endpoint pagination constraints.

### Endpoints

| Status | Method | Path | Description |
|--------|--------|------|-------------|
| **Added** | `GET` | `/v4/activity/neo` | Retrieve activity events from audit logs with filtering and pagination |
| **Added** | `GET` | `/v4/activity/neo/export` | Export activity events to CSV format for compliance |
| **Modified** | `GET` | `/v4/activity` | Removed `limit` default (1000) and maximum (10000) constraints |
| **Modified** | `GET` | `/v4/workflows` | Removed `userId` query parameter filter |

### Schema Changes

| Schema | Change | Details |
|--------|--------|---------|
| `WorkflowResponse` | Modified | Removed `channelCounts` property (event type channel counts) |
| `WorkflowResponse` | Modified | Removed `DELETED` from `status` enum values |
| `WorkflowListResponse` | Modified | Removed `DELETED` from workflow item `status` enum values |
| `ActivityListResponse` | Added | New schema for `/v4/activity/neo` endpoint response |
| `CreateWorkflowBody` | Modified | Reordered discriminator schema order (no functional change) |

### Breaking Changes

> **WARNING: This update contains breaking changes that may affect existing clients.**

**What breaks:**
- `GET /v4/workflows?userId=...` - The `userId` query parameter has been removed and will be ignored
- Workflow responses no longer include the `channelCounts` property - code accessing this field will fail
- The `DELETED` status value has been removed from workflow status enums - clients handling this state need updates

**Migration guide:**
- Remove `userId` parameter from workflow list requests (team context filtering must use alternative approach)
- Update code that reads `workflow.channelCounts` - remove references or implement alternative channel tracking
- Update workflow status handling to remove `DELETED` case from switch/if statements
- Consider migrating to new `/v4/activity/neo` endpoints for enhanced audit log capabilities with `relativeTime` and `interfaces` filters

### Impact Assessment

- **Backward Compatible:** No
- **Requires SDK Regeneration:** Yes
- **Client Action Required:** Required

