# OpenAPI Specifications

This directory contains the OpenAPI specification documents used to generate the Kadoa SDKs.

## Files

- `openapi.json` - The OpenAPI 3.0 specification document
- `openapi-metadata.json` - Metadata about when and from where the spec was fetched

## Versioning Strategy

The OpenAPI spec is versioned alongside the SDK releases:

1. **Fetching Latest Spec**: Before creating a new SDK version, fetch the latest spec:
   ```bash
   bun kadoa-codegen fetch-spec -e https://api.kadoa.com/openapi -f
   ```

2. **Custom Endpoints**: You can fetch from different environments:
   ```bash
   # Fetch from localhost (development)
   bun kadoa-codegen fetch-spec -e http://localhost:12380/openapi -f
   
   # Fetch from staging
   bun kadoa-codegen fetch-spec -e https://staging-api.kadoa.com/openapi -f
   ```

3. **Version Tracking**: The spec is committed to git, providing:
   - Full version history
   - Ability to diff API changes between versions
   - Reproducible builds from any commit
   - Rollback capability if needed

## Workflow

### Standard SDK Release Process

1. **Fetch Latest API Spec**
   ```bash
   bun kadoa-codegen fetch-spec -e https://api.kadoa.com/openapi -f
   ```

2. **Generate SDKs**
   ```bash
   bun kadoa-codegen generate -e https://api.kadoa.com/openapi --fetch-latest -f
   ```

3. **Build and Test**
   ```bash
   bun run build
   ```

4. **Commit Changes**
   ```bash
   git add specs/
   git commit -m "chore: update OpenAPI spec to version X.Y.Z"
   ```

### Quick Development Workflow

For rapid iteration during development:
```bash
# Fetch latest and then generate
bun kadoa-codegen fetch-spec -e http://localhost:12380/openapi -f && bun kadoa-codegen generate --fetch-latest -e http://localhost:12380/openapi -f
```

## Caching

The fetch command implements intelligent caching:
- **TTL**: 24 hours by default
- **Checksum Validation**: Only updates if spec has actually changed
- **Fallback**: Uses existing spec if fetch fails

## Metadata

The `openapi-metadata.json` file tracks:
- `fetchedAt`: Timestamp of last fetch
- `apiVersion`: Version from the OpenAPI spec's info section
- `checksum`: SHA-256 hash for change detection
- `endpoint`: Source endpoint for the spec


## Best Practices

1. **Always commit spec changes** separately from SDK code changes for clear history
2. **Review spec diffs** before generating new SDK versions to understand API changes
3. **Tag releases** that include spec updates for easy reference
4. **Document breaking changes** in the changelog when spec updates include them