# OpenAPI Spec Changes Analysis

## Summary

Schema improvements to activity event filtering and alert rule conditions with no breaking changes. Added relative time filtering support and clarified request source terminology.

### Endpoints

| Status | Method | Path | Description |
|--------|--------|------|-------------|
| **Modified** | `GET` | `/v4/activity-events` | Added optional `relativeTime` query parameter for time window filtering |
| **Modified** | `GET` | `/v4/notifications/activity-events` | Added optional `relativeTime` query parameter for time window filtering |

### Schema Changes

| Schema | Change | Details |
|--------|--------|---------|
| `ActivityEventSource` | Modified | Renamed `interface` property to `requestSource`; added `userEmail` property |
| `AlertRule` | Modified | Simplified `conditions` from array to single object; removed `logicalOperator` property |
| Query Parameters | Modified | Updated `interfaces` parameter description to reference `requestSource` field with new values (SYSTEM, UI, SDK, API) |

### Breaking Changes

> **WARNING: This update contains breaking changes that may affect existing clients.**

**What breaks:**
- `ActivityEventSource.interface` renamed to `ActivityEventSource.requestSource` - clients accessing this property will fail
- `AlertRule.conditions` changed from array to object - clients expecting array structure will break
- `AlertRule.logicalOperator` removed - clients accessing this property will fail
- Interface filter values changed from (SYSTEM, USER, API) to (SYSTEM, UI, SDK, API) - clients using "USER" will need to use "UI"

**Migration guide:**
1. Update all references from `ActivityEventSource.interface` to `ActivityEventSource.requestSource`
2. Update activity event filtering to use new source values: replace "USER" with "UI", add support for "SDK"
3. Refactor `AlertRule.conditions` handling from array iteration to single object access
4. Remove references to `AlertRule.logicalOperator` - logic is now embedded in the conditions object
5. Optionally adopt new `relativeTime` parameter (e.g., "6h", "1d", "2w") for simpler time-based filtering

### Impact Assessment

- **Backward Compatible:** No
- **Requires SDK Regeneration:** Yes
- **Client Action Required:** Required
