## Summary

Replaced compliance-specific endpoints with a general activity tracking API. Removed 2 compliance endpoints (`/v5/compliance/auditlog` and `/v5/compliance/workflows`) and added 3 new v4 activity endpoints for event listing and CSV exports.

### Endpoints

| Status | Method | Path | Description |
|--------|--------|------|-------------|
| **Removed** | `GET` | `/v5/compliance/auditlog` | CSV export for compliance audit logs (removed) |
| **Removed** | `GET` | `/v5/compliance/workflows` | CSV export for compliance workflows (removed) |
| **Added** | `GET` | `/v4/activity/` | List activity events with filtering and pagination |
| **Added** | `GET` | `/v4/activity/export` | Export activity events as CSV (up to 10,000 events) |
| **Added** | `GET` | `/v4/activity/workflows/export` | Export workflow metadata as CSV |

### Schema Changes

| Schema | Change | Details |
|--------|--------|---------|
| `ActivityEvent` | Added | New model for activity events with `title`, `dateTime`, `source`, `resource`, `details` |
| `ActivityEventSource` | Added | Source information with `interface` and `userId` |
| `ActivityEventResource` | Added | Resource information with `type`, `workflowId`, `resourceId`, `name`, `runId` |
| `ActivityEventDetails` | Added | Flexible object for event-specific details |
| `ActivityPaginationMeta` | Added | Pagination metadata with `total`, `limit`, `offset`, `hasMore` |
| `ActivityListResponse` | Added | Response wrapper containing `events` array and `meta` pagination |

### Breaking Changes

> **WARNING: This update contains breaking changes that may affect existing clients.**

**What breaks:**
- `GET /v5/compliance/auditlog` endpoint removed - previously returned CSV audit logs
- `GET /v5/compliance/workflows` endpoint removed - previously returned CSV workflow exports
- Authentication flow changed from compliance officer-only access to API key authentication

**Migration guide:**
- Replace `/v5/compliance/auditlog` calls with `/v4/activity/export?eventTypes=<events>&interfaces=<interfaces>`
- Replace `/v5/compliance/workflows` calls with `/v4/activity/workflows/export?timeFilter=<filter>`
- Update authentication from compliance-specific BearerAuth to standard ApiKeyAuth
- Adjust CSV parsing logic if needed - new endpoints may have different column structures
- Use new filtering parameters: `workflowId`, `userId`, `startDate`, `endDate`, `eventTypes`, `interfaces`

### Impact Assessment

- **Backward Compatible:** No
- **Requires SDK Regeneration:** Yes
- **Client Action Required:** Required
