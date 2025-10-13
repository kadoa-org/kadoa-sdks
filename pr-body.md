## OpenAPI Spec Update

This PR updates `specs/openapi.json` and `specs/openapi-metadata.json` with the latest version from `https://api.kadoa.com/openapi`.

## Summary

Schema improvements to error handling with enhanced error context properties. The `errors` array has been moved from nested `lastJob` to top-level in workflow responses, and the error `context` object now includes structured fields for better debugging.

### Endpoints

No endpoint changes.

### Schema Changes

| Schema | Change | Details |
|--------|--------|---------|
| `WorkflowResponse` | Modified | Moved `errors` array from nested `lastJob.errors` to top-level `errors` property (appears in multiple workflow endpoints) |
| `ErrorContext` | Modified | Added structured properties: `url`, `httpStatus`, `retryCount`, `details`, `timestamp`; marked as `additionalProperties: true` |

### Breaking Changes

> **WARNING: This update contains breaking changes that may affect existing clients.**

**What breaks:**
- The `errors` array has been moved from `lastJob.errors` to the top-level `errors` property in workflow response objects
- Clients accessing `workflow.lastJob.errors` will receive `undefined` or encounter type errors
- The `lastJob` object structure has been simplified, removing the nested `errors` property

**Migration guide:**
- Update client code to access `workflow.errors` instead of `workflow.lastJob.errors`
- Remove any type definitions or interfaces that reference `lastJob.errors`
- If using TypeScript/typed clients, regenerate SDK from the new OpenAPI spec to get updated types
- Test error handling flows to ensure error arrays are correctly accessed from the new location

### Impact Assessment

- **Backward Compatible:** No
- **Requires SDK Regeneration:** Yes
- **Client Action Required:** Required

