## Node SDK Style Guide

This guide applies to `sdks/node/src`. Keep it practical and minimal.

### Project structure
- `internal/runtime/`: Cross‑cutting infrastructure (config, http, events, pagination, exceptions, utils). No domain knowledge.
- `internal/domains/`: Domain‑specific internals (orchestrators, services, mappers). Not public.
- `modules/`: Public, consumer‑facing facades ( services, types). Thin wrappers that compose internals.
- `generated/`: OpenAPI client and models. Do not edit.
- `index.ts`: Top‑level public exports only.

### Module boundaries (imports)
- `modules/**`:
  - Allowed: relative imports from `../..` into `internal/runtime/**`, `generated/**`, same module.
  - Forbidden: any imports from `internal/domains/**`.
- `internal/runtime/**`:
  - Allowed: import `generated/**` and other `internal/runtime/**`.
  - Forbidden: imports from `modules/**` or `internal/domains/**`.
- `internal/domains/**`:
  - Allowed: import `internal/runtime/**` and `generated/**`.
  - Forbidden: imports from `modules/**`.
- `generated/**`:
  - No project code should import internals from inside generated subpaths other than its public barrels.

Dependency direction: `modules → internal/domains → internal/runtime` (both domains and runtime may import `generated`).

### Public API surface
- Only export from `src/index.ts` and `src/modules/**/index.ts`.
- Never re‑export anything directly from `internal/**`. If you need to expose something, re‑export it via a curated module facade.

### Events
- Emit via `KadoaClient.emit(...)` inside SDK code. Do not import `EventEmitter` directly in `modules/**`.
- Use typed payloads from `internal/runtime/events/event-types.ts`.

### Errors
- Throw `KadoaSdkException` for SDK logic; wrap HTTP/IO with `KadoaHttpException.wrap(...)`.
- Use `ERROR_MESSAGES` constants for user‑visible strings.
- Do not throw plain `Error` in `modules/**`.

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
- Unit test internals (`internal/**`) and module facades (`modules/**`).
- Integration/E2E tests may rely on recordings; set required env vars when running live.

### Formatting & lint
- Biome is the single source of truth for formatting and basic lint.

### Generated code
- Never modify `src/generated/**` by hand. Regenerate via the repo tooling.


