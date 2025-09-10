# Test Directory Structure

## Overview

This directory contains all tests for the Node.js SDK, organized by test type and purpose.

## Directory Structure

```
test/
├── e2e/                    # End-to-end tests
│   └── extraction.test.ts  # Real API extraction workflow tests
│
├── integration/            # Integration tests
│   ├── fetch-data.test.ts      # Pagination tests with VCR
│   └── submit-extraction.test.ts # Submit workflow tests with VCR
│
├── unit/                   # Unit tests (currently empty)
│
├── fixtures/               # Test data and mocks
│   └── vcr-cache/              # Cached HTTP responses
│       ├── .gitignore          # Ignore cached responses by default
│       └── README.md           # VCR cache documentation
│
├── utils/                  # Testing utilities
│   └── vcr/               # VCR (Video Cassette Recorder) implementation
│       ├── axios-vcr.ts        # Core VCR interceptor
│       ├── vcr-api-provider.ts # VCR-enabled KadoaClient
│       ├── vcr-utils.ts        # VCR management utilities
│       └── index.ts            # Consolidated exports
│
├── headers.test.ts         # SDK header configuration tests
└── TESTING_GUIDE.md        # Testing style guide and conventions
```

## Environment Setup

### Required Environment Variables

```bash
# Required for all tests
TEST_USER_API_KEY=your-api-key
KADOA_BASE_URL=http://localhost:12380

# Optional
VCR_MODE=auto          # Options: record, replay, auto
VCR_DEBUG=true         # Enable debug logging
TEST_WORKFLOW_ID=xxx   # Specific workflow for integration tests
```

### Quick Start

```bash
# Set required variables
export TEST_USER_API_KEY=your-api-key
export KADOA_BASE_URL=http://localhost:12380

# Run tests
bun test
```

## Test Types

### Unit Tests (`unit/`)
- Test individual functions and classes in isolation
- Use mocks for all dependencies
- Should be fast and deterministic

### Integration Tests (`integration/`)
- Test module interactions
- Use VCR for API calls (record/replay pattern)
- Test complex flows like pagination

### End-to-End Tests (`e2e/`)
- Test complete workflows against real API
- Require valid API credentials
- May take longer to execute

## VCR (Video Cassette Recorder)

VCR allows recording and replaying HTTP responses for fast, deterministic testing.

### Usage

```bash
# Record mode - makes real API calls and saves responses
VCR_MODE=record bun test

# Replay mode - uses only cached responses
VCR_MODE=replay bun test

# Auto mode (default) - uses cache if exists, records if not
bun test
```

### Benefits
- **5x faster** test execution in replay mode
- **Deterministic** results
- **Offline** development capability
- **Cost savings** on API calls

## Running Tests

```bash
# All tests
bun test

# Specific directory
bun test test/integration
bun test test/e2e

# Single file
bun test test/integration/fetch-data-vcr.test.ts

# Watch mode
bun test --watch
```

## Test Conventions

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for detailed testing conventions and best practices.