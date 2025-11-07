# Contributing to Kadoa SDKs

Thank you for your interest in contributing to Kadoa SDKs. This guide will help you get started.

## Prerequisites

- **Bun** v1.2.21+ (primary package manager)
- **Node.js** v20+ (for npm publishing)
- **Python** 3.8+ (for Python SDK)
- **Git** with conventional commits knowledge

## Development Setup

```bash
# Clone repository
git clone https://github.com/kadoa-org/kadoa-sdks
cd kadoa-sdks

# Install dependencies
bun install

# Run development mode
bun run dev
```

## Project Structure

```
kadoa-sdks/
├── sdks/
│   ├── node/        # Node.js SDK (public)
│   └── python/      # Python SDK (public)
├── examples/        # Usage examples
├── tools/
│   └── codegen/     # OpenAPI code generation
└── specs/           # OpenAPI specifications
```

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/). Your commit message determines if a release is triggered.

### Format
```
<type>(<scope>): <subject>
```

### Scopes
- `sdks/node` - Node SDK changes
- `sdks/python` - Python SDK changes
- `tools/codegen` - Code generation tooling
- `examples/node-examples` - Node examples
- `examples/python-examples` - Python examples
- `ci` - CI/CD pipeline
- `deps` - Dependencies
- `docs` - Documentation

### Types That Trigger Releases
- `feat` - New features (minor version bump)
- `fix` - Bug fixes (patch version bump)
- `feat!` or `fix!` - Breaking changes (major version bump)

### Types That Don't Trigger Releases
- `chore`, `ci`, `docs`, `style`, `refactor`, `test`

### Examples
```bash
# Triggers release
git commit -m "feat(sdks/node): add retry logic to API client"
git commit -m "fix(sdks/python): correct type hints for response"

# Doesn't trigger release (but tracked in changelog)
git commit -m "chore(deps): update dependencies"
git commit -m "ci: optimize build pipeline"
```

## Working with OpenAPI Specs

### Updating API Definitions

1. Fetch latest spec:
```bash
bun kadoa-codegen fetch-spec -e https://api.kadoa.com/openapi -f
```

2. Generate SDKs:
```bash
bun kadoa-codegen generate
```

3. Test changes:
```bash
cd sdks/node && bun test
cd sdks/python && uv run pytest
```

4. Commit spec and generated code:
```bash
git add specs/openapi.json sdks/*/src/generated
git commit -m "feat: update API client to latest spec"
```

## Testing

### Node SDK
```bash
cd sdks/node
bun test                # Run all tests
bun test test/e2e      # Run E2E tests only
bun test:watch         # Watch mode
```

### Python SDK
```bash
cd sdks/python
uv run pytest              # Run all tests
uv run pytest -m e2e       # Run E2E tests only
uv run pytest --cov=kadoa_sdk --cov-report=term-missing  # With coverage report
```

## Release Process

### Automatic Releases
1. Make changes with proper commit messages
2. Push to main branch
3. Release Please creates PR automatically
4. Merge PR to trigger release and publishing

### Manual Releases (for CI/infrastructure)
```bash
gh workflow run "Manual Release" \
  -f sdk="both" \
  -f bump-type="patch" \
  -f reason="Critical fixes"
```

## Code Quality

### Linting and Formatting
```bash
# Check
bun run format-and-lint

# Fix
bun run format-and-lint:fix
```

### Pre-commit Hooks
Husky runs commitlint automatically. Invalid commit messages will be rejected.

## Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feat/amazing-feature`
3. Make changes following guidelines above
4. Ensure tests pass
5. Submit PR with clear description

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- For security issues, please email security@kadoa.com

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.