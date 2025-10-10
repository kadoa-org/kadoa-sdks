## Node SDK Style Guide

This guide applies to `sdks/node/src`. Keep it practical and minimal.

### Project structure
- `runtime/`: Cross‑cutting infrastructure (config, http, events, pagination, exceptions, utils). No domain knowledge.
- `domains/`: Domain‑specific services and ACLs. Anything under a domain folder is part of the public surface unless nested under `domains/<name>/internal/`.
- `boundary/`: Reserved for future boundary-specific adapters (currently empty).
- `generated/`: OpenAPI client and models. Do not edit.
- `index.ts`: Top‑level public exports only.

### Module boundaries (imports)
- `runtime/**`:
  - Allowed: import `generated/**` and other `runtime/**`.
  - Forbidden: imports from `domains/**`.
- `domains/**`:
  - Allowed: import `runtime/**`, `generated/**`, and sibling domain barrels when composition is required.
  - Forbidden: imports from another domain’s `internal/**` folder.
- `domains/**/internal/**`:
  - Allowed: import the parent domain barrel and `runtime/**`.
  - Forbidden: being imported from outside its parent domain.
- `generated/**`:
  - No project code should import internals from inside generated subpaths other than its public barrels.

Dependency direction: `domains → runtime` (both layers may import `generated`).

### Public API surface
- Only export from `src/index.ts` and domain barrels under `src/domains/**/index.ts`.
- Never re‑export anything directly from `runtime/**` unless it is intentionally public (e.g., pagination helpers).

### Events
- Emit via `KadoaClient.emit(...)` inside SDK code. Do not instantiate raw `EventEmitter` inside domains.
- Use typed payloads from `runtime/events/event-types.ts`.

### Errors
- Throw `KadoaSdkException` for SDK logic; wrap HTTP/IO with `KadoaHttpException.wrap(...)`.
- Use `ERROR_MESSAGES` constants for user‑visible strings.
- Do not throw plain `Error` in public domain services.

### Logging
- Keep logs concise and actionable for production debugging. Avoid verbose/noisy logs and PII.
- Prefer structured error details on exceptions over `console.log`.

### Imports
- Use relative imports; prefer the shortest path.
- Do not deep‑link into files within `generated/**` unless needed for types that have no barrel.

### Naming & files
- Files: kebab‑case (`run-extraction.command.ts`).
- Classes/Types: PascalCase. Variables/functions: camelCase. Constants: UPPER_SNAKE_CASE.
- Avoid abbreviations in identifiers.

### Testing
- Unit test domain services (`domains/**`) and runtime utilities.
- Integration/E2E tests may rely on recordings; set required env vars when running live.

### Formatting & lint
- Biome is the single source of truth for formatting and basic lint.

### Generated code
- Never modify `src/generated/**` by hand. Regenerate via the repo tooling.

### ACL files (`*.acl.ts`)

**Purpose**: Anti-Corruption Layer (ACL) files provide an explicit boundary that shields consumers from upstream changes in generated OpenAPI clients and enforces deliberate type curation.

**Core Principles**:
1. Generated code is only imported inside ACL files.
2. Never re-export generated types; rephrase or wrap them with SDK-specific names.
3. Prefer explicit classes/interfaces that `implements` generated contracts over structural typing.
4. Keep ACL exports minimal: share only what downstream code needs, not the entire API surface.
5. Co-locate validation, normalization, and enum mappings required to talk to the API.
6. Fail fast: if a generated interface adds fields, TypeScript compile-time errors in ACLs should surface the drift.
7. **No duplicate imports**: Each generated type should be imported from `/generated` at most once across all ACL files. If a type is needed in multiple domains, determine the single source of truth based on domain ownership.

**File Layout**:
- Place ACLs under `domains/<domain>/` with the suffix `<feature>.acl.ts`.
- Mirror the generated module name to improve discoverability (`validation.acl.ts` ↔ `generated/api/data-validation-api.ts`).
- Keep each ACL focused; create additional ACL files when a domain integrates multiple generated modules.

**Naming Conventions**:
- **Request-like inputs**: `VerbResourceRequest` (e.g., `CreateRuleRequest`, `ListRulesRequest`) for payloads sent to the API.
- **SDK-facing input wrappers**: `VerbResourceInput` when representing caller-provided data before adapter processing.
- **Response types**: `ResourceResponse` or `VerbResourceResponse` for data returned from adapters.
- **Filters/Options**: `ResourceFilter`, `ListResourceOptions`, or `ResourceQuery` depending on intent; keep suffixes consistent within a domain.
- **Enums**: `PascalCase` singular names (`RuleStatus`) with literal members exported as `const` objects plus a `type` alias. Enum member identifiers should be `PascalCase` (`Enabled`) even if underlying values are snake/lower case.
  ```typescript
  // Basic pattern
  const RuleStatus = {
    Preview: "preview",
    Enabled: "enabled",
  } as const satisfies Record<keyof typeof GeneratedEnum, string>;

  export type RuleStatus = (typeof RuleStatus)[keyof typeof RuleStatus];
  ```
- **Adapter helpers**: `toApiPayload`, `fromApiPayload`, `map<Resource>Response`, `normalize<Resource>`—prefix with verbs to convey direction.
- Avoid generic names like `Data`, `Info`, `Result`; prefer domain-specific terms.

**Type Wrapping Strategy**:

PREFERRED: Explicit classes/interfaces with flattened structure. Always prefer classes or interfaces that `implements` generated contracts with explicit property declarations. This creates a true boundary that prevents nested generated structures from leaking into the SDK.

```typescript
// ✅ PREFERRED: Explicit properties prevent nested structure leakage
export class ListRulesRequest
  implements DataValidationApiV4DataValidationRulesGetRequest
{
  groupId?: string;
  workflowId?: string;
  page?: number;
  status?: RuleStatus;
  pageSize?: number;
  includeDeleted?: boolean;
}
```

Benefits: Changes to generated type structure won't leak through the ACL boundary, provides explicit type safety via `implements` checks, self-documenting with clear property lists, and allows customization (e.g., replacing generated enums with SDK enums).

AVOID: Simple type aliases that merely rename or extract from generated types—they expose nested structures and don't create a proper boundary.

```typescript
// ⚠️ AVOID: Just renaming, nested structure still leaks
export type CreateRuleRequest =
  DataValidationApiV4DataValidationRulesPostRequest["createRule"];
```

Exception: Type aliases are acceptable only when the generated type is already flat, stable, and unlikely to change, or when extracting a deeply nested utility type that would be impractical to redefine (document why).

**Allowed Patterns**:
- `const` maps that mirror generated enums, declared with `satisfies Record<keyof typeof UpstreamEnum, string>`.
- Adapter helpers for request/response transformation.
- Domain-specific guards or refinements that accept the generated type but return curated SDK types.
- Unit tests that import ACL exports (never generated modules directly).

**Prohibited Patterns**:
- Importing from `/generated/**` outside of ACL files.
- Explicit classes with `implements` that duplicate generated types without customization.
- Implicit `any` or inferred exports that change when the generator changes.
- Mixing ACL logic with business services or command handlers.

**Implementation Checklist**:
1. Identify the generated operations needed (`DataValidationApi` methods, types, enums).
2. **Verify no duplicate imports**: Check that the type is not already imported in another ACL file.
3. Create/extend the relevant `<feature>.acl.ts`.
4. Define SDK-facing types and ensure enums use literal unions.
5. Add adapter functions for request/response translation, including defaulting, parsing, and error normalization.
6. Update domain services to import only from the ACL module.
7. Add unit tests covering adapters and enum completeness checks.

**Recommended File Header**:
```typescript
/**
 * Validation domain ACL.
 * Wraps generated DataValidationApi requests/responses and normalizes enums.
 * Downstream code must import from this module instead of `generated/**`.
 */
```

**Future Lint Enforcement**:
- `biome.json` will block imports from `/generated/**` unless the file ends with `.acl.ts`.
- Existing violations should be migrated incrementally; temporary waivers must reference a tracking issue.
