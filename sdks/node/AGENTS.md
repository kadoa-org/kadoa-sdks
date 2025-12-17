# Node SDK

This file provides Node.js SDK-specific guidance to AI coding assistants.

## Style Guide

@STYLEGUIDE.md

## Essential Commands

```bash
cd sdks/node

# Build
bun run build

# Development
bun run dev:watch

# Testing
direnv exec . bun test
direnv exec . bun test test/e2e
direnv exec . bun test --watch
```

## Architecture

### Directory Structure

```
sdks/node/
├── src/
│   ├── index.ts           # Public API exports
│   ├── kadoa-client.ts    # Main client implementation
│   ├── runtime/           # Cross-cutting infra (http, events, pagination, exceptions)
│   └── domains/           # Domain-specific services and ACLs
│   └── generated/         # OpenAPI-generated client
└── test/
```

### Key Technical Patterns

1. **SDK Initialization Pattern**: `KadoaClient` wires domain services together and exposes them directly.
2. **Domain-First Design**: Each folder under `domains/` provides the public API for that area; helpers live under `domains/<name>/internal/`.
3. **Generated Code**: API clients are auto-generated from OpenAPI specs in `generated/` and wrapped by ACL files in each domain.
4. **Import Boundaries**:
   - `runtime/**` must not import from `domains/**`
   - Domains only import from other domain barrels, `runtime/**`, or generated ACLs
   - Never edit `generated/**` by hand

## Development Workflow

### Adding New Features

1. Update the OpenAPI spec if adding new API endpoints
2. Run code generation to update the generated clients
3. Implement the feature in the appropriate domain service
4. Add tests in the test directory
5. Update examples if the feature affects the public API

### Code Style

- **Biome** for formatting/linting
- **Imports** must respect boundaries (see STYLEGUIDE.md)
- Never edit `generated/**` by hand
- **Organize imports** is enabled - `bun run format-and-lint:fix` will sort and group imports automatically

## Testing Strategy

- Uses **Bun's built-in test runner**
- E2E tests require `KADOA_API_KEY` environment variable
- Unit test domain services (`domains/**`) and runtime utilities
- Integration/E2E tests may rely on recordings

## Release

Follows conventional commits with `node-sdk` scope:
- `feat(node-sdk):` - New features (minor version bump)
- `fix(node-sdk):` - Bug fixes (patch version bump)
- `feat(node-sdk)!:` or `fix(node-sdk)!:` - Breaking changes (major version bump)

Example: `git commit -m "feat(node-sdk): add retry logic to API client"`

