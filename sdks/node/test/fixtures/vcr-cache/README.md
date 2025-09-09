# VCR Cache Directory

This directory contains cached HTTP responses for integration tests using the VCR (Video Cassette Recorder) pattern.

## How it Works

The VCR system records real API responses and replays them in subsequent test runs, providing:
- Fast test execution (no network calls in replay mode)
- Deterministic test results
- Ability to test without API access
- Protection against API rate limits

## Usage

### Running Tests with Different Modes

```bash
# Record mode - Makes real API calls and saves responses
VCR_MODE=record bun test

# Replay mode - Uses only cached responses (fails if cache missing)
VCR_MODE=replay bun test

# Auto mode (default) - Uses cache if exists, records if not
bun test
```

### Environment Variables

- `VCR_MODE` - Set to `record`, `replay`, or `auto` (default: `auto`)
- `VCR_CACHE_DIR` - Override cache directory location (default: `test/fixtures/vcr-cache`)
- `VCR_DEBUG` - Enable debug logging (default: `false`)

### Refreshing Cache

To update cached responses when the API changes:

```bash
# Clear all cache
rm -rf test/fixtures/vcr-cache/*

# Re-record all tests
VCR_MODE=record bun test

# Or clear specific test suite
rm -rf test/fixtures/vcr-cache/fetch-data/*
VCR_MODE=record bun test test/integration/fetch-data-vcr.test.ts
```

### Cache Management Commands

```typescript
import { VCRUtils } from "../fixtures/vcr-utils";

// Clear all cache
VCRUtils.clearAllCache();

// Clear cache for specific suite
VCRUtils.clearSuiteCache("fetch-data");

// List all recordings
const recordings = VCRUtils.listRecordings();

// Get cache statistics
const stats = VCRUtils.getCacheStats();

// Clean recordings older than 30 days
VCRUtils.cleanOldRecordings(30);

// Export recordings for backup
await VCRUtils.exportRecordings("backup.json");

// Import recordings from backup
await VCRUtils.importRecordings("backup.json");
```

## Cache Structure

```
vcr-cache/
├── fetch-data/          # Test suite specific cache
│   ├── a1/             # First 2 chars of hash as subdirectory
│   │   └── a1b2c3...json  # Cached response
│   └── b2/
│       └── b2c3d4...json
└── other-tests/
    └── ...
```

## Important Notes

1. **Sensitive Data**: The VCR system automatically sanitizes sensitive headers (API keys, auth tokens) and normalizes timestamps
2. **Git**: By default, cached responses are gitignored. You can commit specific test recordings by modifying `.gitignore`
3. **CI/CD**: In CI, use `VCR_MODE=replay` to ensure tests use cached responses and don't make real API calls
4. **Determinism**: Timestamps and request IDs are normalized to ensure consistent cache keys

## Troubleshooting

### "No cached response" error in replay mode
- Run the test with `VCR_MODE=record` first to create the cache
- Check that the cache file exists in the expected location
- Ensure the request parameters match exactly (method, URL, params)

### Cache not being used
- Check `VCR_MODE` environment variable
- Verify cache directory permissions
- Enable debug mode: `VCR_DEBUG=true bun test`

### Different results between record and replay
- Check if API response has changed
- Verify sanitization rules are working correctly
- Look for non-deterministic data that needs normalization