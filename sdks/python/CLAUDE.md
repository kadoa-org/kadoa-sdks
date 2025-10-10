# Python SDK

This file provides Python SDK-specific guidance to Claude Code.

## Essential Commands

```bash
cd sdks/python

# Install
make install          # Install SDK
make install-dev      # Install with dev dependencies

# Testing
make test            # All tests
make test-e2e        # E2E tests only
make test-coverage   # With coverage report

# Code quality
make lint            # Run ruff linter
make format          # Format with black

# Clean
make clean           # Remove build artifacts
```

## Architecture

### Directory Structure

```
sdks/python/
├── kadoa_sdk/
│   ├── __init__.py        # Public API exports
│   ├── client.py          # Main client implementation
│   ├── core/              # Core utilities
│   └── extraction/        # Extraction features
└── tests/
```

### Key Technical Patterns

1. **SDK Initialization Pattern**: Client initialization returns configured API clients
2. **Generated Code**: API clients are auto-generated from OpenAPI specs
3. **Public API**: Only export from `kadoa_sdk/__init__.py`

## Development Workflow

### Adding New Features

1. Update the OpenAPI spec if adding new API endpoints
2. Run code generation to update the generated clients
3. Implement the feature in the appropriate module
4. Add tests in the tests directory
5. Update examples if the feature affects the public API

### Code Style

- **Black** (100 char line length) for formatting
- **Ruff** for linting
- Follow Python PEP 8 conventions
- Generated code should never be manually edited

## Testing Strategy

- Uses **pytest** with coverage reporting
- E2E tests require `KADOA_API_KEY` environment variable
- Run tests with `make test` or `make test-e2e`
- Coverage reports available with `make test-coverage`

## Release

Follows conventional commits with `python-sdk` scope:
- `feat(python-sdk):` - New features (minor version bump)
- `fix(python-sdk):` - Bug fixes (patch version bump)
- `feat(python-sdk)!:` or `fix(python-sdk)!:` - Breaking changes (major version bump)

Example: `git commit -m "feat(python-sdk): add retry logic to API client"`
