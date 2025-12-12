## Package Manager

**Bun** is the primary package manager. Use `bun` instead of `npm/yarn/pnpm` for all commands. The Node.js SDK publishes to NPM despite using Bun for development.

## Essential Commands

### Repository-wide Commands

Run these commands for common tasks:

```bash
# Install dependencies
bun install

# Format and lint code (Biome)
bun run format-and-lint        # Check only
bun run format-and-lint:fix    # Auto-fix issues

# Build all SDKs
bun run build
bun run build:sdks

# Development mode
bun run dev                    # All packages
bun run dev:node              # Node SDK + examples
```

### Code Generation Commands

A custom CLI fetches OpenAPI specs and generates SDK clients:

```bash
# Fetch latest OpenAPI spec
bun kadoa-codegen fetch-spec -e https://api.kadoa.com/openapi -f

# Generate both Node and Python SDKs
bun kadoa-codegen generate -e https://api.kadoa.com/openapi --fetch-latest -f

# Generate specific SDK only
bun kadoa-codegen generate -c node -e https://api.kadoa.com/openapi --fetch-latest -f
bun kadoa-codegen generate -c python -e https://api.kadoa.com/openapi --fetch-latest -f

# Local development
bun kadoa-codegen fetch-spec -e http://localhost:12380/openapi -f
bun kadoa-codegen generate --fetch-latest -e http://localhost:12380/openapi -f
```

## Architecture Overview

### Monorepo Structure

The Turborepo-based monorepo contains these directories:

```
kadoa-sdks/
├── sdks/
│   ├── node/           # Node.js/TypeScript SDK
│   └── python/         # Python SDK
├── examples/
│   ├── node-examples/
│   └── python-examples/
├── tools/
│   └── codegen/        # Custom code generation CLI
└── specs/              # OpenAPI specifications
```

### Key Technical Patterns

The SDKs share these patterns:

- **SDK Initialization** — Both SDKs use a client initialization pattern returning configured API clients
- **Generated Code** — API clients auto-generate from OpenAPI specs into `generated/` directories
- **Monorepo Tasks** — Turbo coordinates tasks with build caching

## Development Workflow

### Adding New Features

To add a feature:

1. Update the OpenAPI spec for new API endpoints.
2. Run code generation to update generated clients.
3. Implement the feature in the appropriate module.
4. Add tests in the test directory.
5. Update examples if the feature affects the public API.

## Release Process

[Release Please](https://github.com/googleapis/release-please) handles automated versioning.

### Conventional Commits

The repository enforces conventional commits with these scopes:

- `spec` — OpenAPI spec updates
- `node-sdk` — Node SDK changes
- `python-sdk` — Python SDK changes
- `codegen` — Code generation tooling
- `node-examples` — Node example code
- `python-examples` — Python example code
- `ci` — CI/CD changes
- `deps` — Dependency updates
- `release` — Release configuration
- `docs` — Documentation

### Commit Types and Changelog Visibility

These commit types trigger releases:

- `feat:` — New features (minor version bump)
- `fix:` — Bug fixes (patch version bump)
- `feat!:` or `fix!:` — Breaking changes (major version bump)

**Changelog visibility**: Only `feat`, `fix`, `perf`, and `revert` commits appear in public changelogs. Other types (`chore`, `docs`, `refactor`, `test`, `ci`, `build`, `style`) stay hidden.

Example: `git commit -m "feat(node-sdk): add retry logic to API client"`

## Important Notes

Keep these guidelines in mind:

- Husky runs Git hooks with commitlint for conventional commits
- Release-please manages releases separately for each SDK
- Both SDKs follow similar architectural patterns for consistency
- Never manually edit generated code — always regenerate from specs
- Production builds use committed specs only (don't use `--fetch-latest` in CI)

