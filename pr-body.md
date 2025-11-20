## OpenAPI Spec Update

This PR updates `specs/openapi.json` and `specs/openapi-metadata.json` with the latest version from `https://api.kadoa.com/openapi`.

# OpenAPI Spec Changes Analysis

## Summary

Added new crawler configuration options and enhanced navigation mode support for workflow management. All changes are backward compatible additions to existing schemas.

### Endpoints

No endpoint changes.

### Schema Changes

| Schema | Change | Details |
|--------|--------|---------|
| `WorkflowCreateRequest` | Modified | Added optional crawler properties: `maxPages`, `maxDepth`, `pathsFilterIn`, `pathsFilterOut` |
| `WorkflowUpdateRequest` | Modified | Added optional crawler properties: `maxPages`, `maxDepth`, `pathsFilterIn`, `pathsFilterOut` |
| `WorkflowRunRequest` | Modified | Added optional crawler properties: `maxPages`, `maxDepth`, `pathsFilterIn`, `pathsFilterOut` |
| `NavigationMode` enum | Modified | Added new value: `all-pages` for crawler-based navigation |

### Impact Assessment

- **Backward Compatible:** Yes
- **Requires SDK Regeneration:** Yes
- **Client Action Required:** Optional

**Details:**
- New crawler configuration properties (`maxPages`, `maxDepth`, `pathsFilterIn`, `pathsFilterOut`) are optional and only apply when `navigationMode` is set to `all-pages`
- `maxPages` allows configuring maximum pages to crawl (1-100,000, default: 10,000)
- `maxDepth` controls maximum crawl depth (1-200, default: 50)
- `pathsFilterIn` and `pathsFilterOut` enable regex-based path filtering during crawling
- The new `all-pages` navigation mode enables comprehensive site crawling functionality
- Existing workflows continue to function without modification
- SDK regeneration recommended to access new crawler configuration options

