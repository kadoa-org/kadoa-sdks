# Development Workflow

This document outlines the development workflow for the Kadoa SDKs repository, including branch protection setup and preview releases.

## Branch Strategy

### Main Branch (`main`)
- **Purpose**: Stable releases and production-ready code
- **Releases**: Automatic via Release Please
- **Versioning**: Semantic versioning (e.g., `1.2.3`)
- **Publishing**: npm/PyPI with `latest` tag

### Development Branch (`development`)
- **Purpose**: Integration branch for new features and bug fixes
- **Releases**: Preview releases for every commit
- **Versioning**: `X.Y.Z-dev.{shortSHA}` (e.g., `0.13.0-dev.abc1234`)
- **Publishing**: npm with `dev` tag, PyPI as prerelease

## Branch Protection Setup

### Option 1: Using GitHub CLI (Recommended)

Use the automated setup script for faster configuration:

```bash
# Run the complete setup script
bash docs/BRANCH_SETUP_CLI.md

# Or run individual commands
git checkout -b development
git push -u origin development

# Set up branch protection
gh api repos/:owner/:repo/branches/development/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["preview-release"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":false}' \
  --field restrictions='{"users":[],"teams":[],"apps":[]}' \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

See [Branch Setup CLI Guide](./BRANCH_SETUP_CLI.md) for detailed instructions and troubleshooting.

### Option 2: Manual GitHub UI Setup

1. Go to **Settings** → **Branches**
2. Click **Add rule** for the `development` branch
3. Configure the following settings:

**Required Status Checks:**
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- Select: `preview-release` (when available)

**Restrictions:**
- ✅ Restrict pushes that create files larger than 100MB
- ✅ Require linear history
- ✅ Include administrators

**Rules Applied To:**
- ✅ Include administrators

### 3. Workflow Permissions

Ensure the following GitHub Actions have the required permissions:

- `contents: write` - For creating tags and releases
- `packages: write` - For publishing to npm/PyPI

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch from development
git checkout development
git pull origin development
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR to development
git push origin feature/your-feature-name
```

### 2. Preview Releases

Every commit to the `development` branch automatically triggers:

1. **Version Generation**: Creates preview version with commit SHA
2. **Build Process**: Builds both Node.js and Python SDKs
3. **Publishing**: 
   - Node.js: Published to npm with `dev` tag
   - Python: Published to PyPI as prerelease
4. **Git Tagging**: Creates `preview-X.Y.Z-dev.{SHA}` tag
5. **GitHub Release**: Creates prerelease with installation instructions

### 3. Stable Release Process

When ready for a stable release:

```bash
# Merge development into main
git checkout main
git pull origin main
git merge development
git push origin main

# Release Please will automatically:
# 1. Create a release PR
# 2. Update changelogs
# 3. Bump versions
# 4. Create GitHub release
# 5. Publish to npm/PyPI with latest tag
```

## Installing Preview Versions

### Node.js SDK

```bash
# Install latest preview version
npm install @kadoa/node-sdk@dev

# Install specific preview version
npm install @kadoa/node-sdk@0.13.0-dev.abc1234
```

### Python SDK

```bash
# Install latest preview version
pip install --pre kadoa_sdk

# Install specific preview version
pip install kadoa_sdk==0.13.0-dev.abc1234
```

## Monitoring and Debugging

### Check Preview Releases

```bash
# List recent preview releases
gh release list --limit 10 --prerelease

# Check workflow runs
gh run list --workflow=preview-release

# View specific workflow run
gh run view <run-id>
```

### Check Published Packages

```bash
# Check npm package versions
npm view @kadoa/node-sdk versions --json

# Check PyPI package versions
pip index versions kadoa_sdk
```

## Troubleshooting

### Common Issues

1. **Workflow Fails on Version Update**
   - Check if `.release-please-manifest.json` exists
   - Verify commit SHA generation

2. **Publishing Fails**
   - Verify `NPM_TOKEN` and `PYPI_API_TOKEN` secrets are set
   - Check package version conflicts

3. **Git Tag Creation Fails**
   - Ensure `GITHUB_TOKEN` has sufficient permissions
   - Check if tag already exists

### Manual Recovery

If a preview release fails:

```bash
# Check workflow logs
gh run view <failed-run-id>

# Manually trigger workflow
gh workflow run preview-release

# Or create a new commit to trigger
git commit --allow-empty -m "chore: retry preview release"
git push origin development
```

## Best Practices

1. **Keep Development Branch Updated**: Regularly merge `main` into `development`
2. **Test Preview Versions**: Always test preview versions before merging to main
3. **Clear Commit Messages**: Use conventional commits for better changelog generation
4. **Monitor Workflow Health**: Check workflow runs regularly for failures
5. **Document Breaking Changes**: Clearly document any breaking changes in preview releases
