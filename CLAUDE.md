# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## SDK-Specific Instructions

@sdks/node/CLAUDE.md
@sdks/python/CLAUDE.md

## Package Manager

**Bun** is used as the primary package manager for this monorepo (v1.2.21). All development commands should use `bun` instead of `npm/yarn/pnpm`. Note that the Node.js SDK is published to NPM registry despite using Bun for development.

## Essential Commands

### Repository-wide Commands

```bash
# Install dependencies
bun install

# Format and lint code (uses Biome)
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

The repository includes a custom CLI tool for fetching OpenAPI specs and generating SDK clients:

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

This is a Turborepo-based monorepo containing:

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

1. **SDK Initialization Pattern**: Both SDKs use a client initialization pattern that returns configured API clients
2. **Generated Code**: API clients are auto-generated from OpenAPI specs and placed in `generated/` directories
3. **Monorepo Tasks**: Turbo is used for task orchestration with caching for builds

## Development Workflow

### Adding New Features

1. Update the OpenAPI spec if adding new API endpoints
2. Run code generation to update the generated clients
3. Implement the feature in the appropriate module
4. Add tests in the test directory
5. Update examples if the feature affects the public API

## Release Process

Uses [Release Please](https://github.com/googleapis/release-please) for automated versioning.

### Conventional Commits

The repository enforces conventional commits with these scopes:
- `spec` - OpenAPI spec updates
- `node-sdk` - Node SDK changes
- `python-sdk` - Python SDK changes
- `codegen` - Code generation tooling
- `node-examples` - Node example code
- `python-examples` - Python example code
- `ci` - CI/CD changes
- `deps` - Dependency updates
- `release` - Release configuration
- `docs` - Documentation

Commit types that trigger releases:
- `feat:` - New features (minor version bump)
- `fix:` - Bug fixes (patch version bump)
- `feat!:` or `fix!:` - Breaking changes (major version bump)

Example: `git commit -m "feat(node-sdk): add retry logic to API client"`

## Important Notes

- The repository uses Husky for Git hooks with commitlint for conventional commits
- Release management is handled by release-please with separate releases for each SDK
- Both SDKs follow similar architectural patterns for consistency
- Generated code should never be manually edited - always regenerate from specs
- Production builds use committed specs only (never use `--fetch-latest` in CI)
