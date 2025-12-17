# Kadoa SDK

Monorepo for Kadoa's official SDKs for Node.js and Python, providing easy integration with Kadoa's web data extraction platform.

## Quick Links

- [Contributing Guide](./CONTRIBUTING.md) - How to contribute to this project
- [Development Workflow](./docs/DEVELOPMENT_WORKFLOW.md) - Preview releases and branch strategy
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
   TEST_USER_API_KEY=your-api-key-here  # Same as KADOA_API_KEY for Node features (personal or team API key)
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

### Development Workflow

**Main Branch (`main`):**
- Stable releases with semantic versioning
- Automatic releases via Release Please
- Published to npm/PyPI with `latest` tag

**Development Branch (`development`):**
- Preview releases for every commit
- Version format: `X.Y.Z-dev.{shortSHA}` (e.g., `0.13.0-dev.abc1234`)
- Published to npm with `dev` tag, PyPI as prerelease
- Install with: `npm install @kadoa/node-sdk@dev` or `pip install --pre kadoa_sdk`

### Automatic Releases

Commits that trigger automatic releases:
- `feat:` - New features (minor version bump)
- `fix:` - Bug fixes (patch version bump)
- `feat!:` or `fix!:` - Breaking changes (major version bump)

Example:
```bash
git commit -m "feat(sdks/python): add retry logic to API client"
```


### Pre-Release (RC) Releases

To create a release candidate for testing before the final release:

#### Python SDK

1. Update version numbers in two locations:
   - `sdks/python/pyproject.toml`: Change `version = "X.Y.Z"` to `version = "X.Y.Zrc1"`
   - `sdks/python/kadoa_sdk/version.py`: Change `__version__ = "X.Y.Z"` to `__version__ = "X.Y.Zrc1"`

2. Build the package:
   ```bash
   cd sdks/python
   uv build
   ```

3. Publish to PyPI:
   ```bash
   uvx uv-publish
   ```
   Note: Requires PyPI credentials configured in `~/.pypirc` (see [Publishing Setup](#publishing-setup))

4. Install the pre-release:
   ```bash
   uv pip install --pre kadoa-sdk==X.Y.Zrc1
   # or with pip
   pip install --pre kadoa-sdk==X.Y.Zrc1
   ```

#### Node.js SDK

1. Update version in `sdks/node/package.json`: Change `"version": "X.Y.Z"` to `"version": "X.Y.Z-rc.1"`

2. Build the package:
   ```bash
   cd sdks/node
   bun run build
   ```

3. Publish to npm with the `rc` tag:
   ```bash
   npm publish --tag rc
   ```

4. Install the pre-release:
   ```bash
   npm install @kadoa/node-sdk@rc
   # or specific version
   npm install @kadoa/node-sdk@X.Y.Z-rc.1
   ```

**Note:** Pre-releases are automatically marked as prerelease versions and won't be installed by default unless explicitly requested with `--pre` flag (Python) or `@rc` tag (Node.js).

### Monitoring

```bash
gh pr list --label "autorelease: pending"  # Check pending releases
gh release list --limit 5                  # View recent releases
gh release list --limit 10 --prerelease    # View preview releases
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

### Syncing Documentation Snippets

Sync tested code snippets from SDK tests to MDX documentation:

```bash
# Sync snippets to docs
bun kadoa-codegen sync-docs

# Preview changes without writing
bun kadoa-codegen sync-docs --dry-run

# Find orphan tags (doc tags without test coverage)
bun kadoa-codegen sync-docs --check

# Find unused tags (test snippets not in docs)
bun kadoa-codegen sync-docs --unused
```

Source files use `@docs-start TAG` / `@docs-end TAG` markers. Target MDX files use `{/* TAG */}` before code blocks.

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

## Troubleshooting

If release-please is not working correctly, ensure that:
- Git tags exist for all released versions (e.g., `node-sdk-v0.16.2`)
- The `.release-please-manifest.json` matches the latest released version
- Commit messages follow conventional commit format (`feat:`, `fix:`, etc.)