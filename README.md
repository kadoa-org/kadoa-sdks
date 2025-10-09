# Kadoa SDK

Monorepo for Kadoa's official SDKs for Node.js and Python, providing easy integration with Kadoa's web data extraction platform.

## Quick Links

- [Contributing Guide](./CONTRIBUTING.md) - How to contribute to this project
- [Node.js SDK Documentation](./sdks/node/README.md) - Installation and usage
- [Python SDK Documentation](./sdks/python/README.md) - Installation and usage

## Environment Setup

This repository uses [direnv](https://direnv.net/) for automatic environment variable management.

### Installing direnv

**macOS:**
```bash
brew install direnv
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc  # for zsh
# OR
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc  # for bash
```

**Linux:**
```bash
curl -sfL https://direnv.net/install.sh | bash
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
```

### Setting Up Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your API credentials:
   ```bash
   # Required for tests
   KADOA_API_KEY=your-api-key-here
   TEST_USER_API_KEY=your-api-key-here  # Same as KADOA_API_KEY for Node features (must start with tk-)
   ```

3. Allow direnv to load the environment:
   ```bash
   direnv allow
   ```

Now environment variables will be automatically loaded when you enter any project directory!

## Changelogs

- [Node SDK Changelog](./sdks/node/CHANGELOG.md) - Public releases
- [Python SDK Changelog](./sdks/python/CHANGELOG.md) - Public releases

## Release Process

This repository uses [Release Please](https://github.com/googleapis/release-please) for automated versioning and releases.

### Automatic Releases

Commits that trigger automatic releases:
- `feat:` - New features (minor version bump)
- `fix:` - Bug fixes (patch version bump)
- `feat!:` or `fix!:` - Breaking changes (major version bump)

Example:
```bash
git commit -m "feat(sdks/python): add retry logic to API client"
```

### Manual Releases

Infrastructure changes (`chore:`, `ci:`, `refactor:`, `docs:`, `test:`) don't trigger releases automatically. Use manual release for critical updates:

```bash
gh workflow run "Manual Release" \
  -f sdk="python" \
  -f bump-type="patch" \
  -f reason="Critical CI fixes"
```

### Monitoring

```bash
gh pr list --label "autorelease: pending"  # Check pending releases
gh release list --limit 5                  # View recent releases
```

## Codegen CLI

SDKs are generated from a committed OpenAPI spec (`specs/openapi.json`) to ensure reproducible builds.

### Updating API Spec

```bash
# Fetch latest spec
bun kadoa-codegen fetch-spec -e https://api.kadoa.com/openapi -f

# Generate SDKs from local spec
bun kadoa-codegen generate

# Commit both spec and generated code
git add specs/openapi.json sdks/*/src/generated
git commit -m "feat: update API client to latest spec"
```

### Local Development

```bash
# Against local API
bun kadoa-codegen fetch-spec -e http://localhost:12380/openapi -f
bun kadoa-codegen generate
```

Note: Production builds use committed specs only. Never use `--fetch-latest` in CI.

## Publishing Setup

### Local Credentials

**npm:** Configure `~/.npmrc`:
```ini
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

**PyPI:** Configure `~/.pypirc`:
```ini
[pypi]
username = __token__
password = pypi-<your-token>
```

### GitHub Actions Secrets

```bash
gh secret set NPM_TOKEN --body "$NPM_TOKEN"
gh secret set PYPI_API_TOKEN --body "$PYPI_API_TOKEN"
```