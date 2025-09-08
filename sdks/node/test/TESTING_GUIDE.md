# Node.js SDK Testing Style Guide

## Test Organization

```
test/
├── unit/          # Unit tests for individual functions
├── integration/   # Integration tests for module interactions
├── e2e/          # End-to-end tests against real/mock services
└── fixtures/     # Shared test data and mocks
```

## Naming Conventions

### Files
- Use `*.test.ts` suffix for test files
- Name after the feature: `extraction.test.ts`, `auth.test.ts`
- Keep names concise: ❌ `run-extraction.test.ts` ✅ `extraction.test.ts`

### Describe Blocks
- Use feature/module names without redundant suffixes
- Keep nesting minimal (max 2 levels)

**Good:**
```typescript
describe("Extraction", () => {
  test("extracts data from valid URL", async () => {});
});
```

**Avoid:**
```typescript
describe("runExtraction E2E Tests", () => {
  describe("Integration Tests", () => {
    test("should run real extraction against a test website", () => {});
  });
});
```

### Test Names
- Be concise and descriptive
- Avoid "should" prefix (implied in tests)
- Use present tense

**Good examples:**
```typescript
test("extracts data from valid URL")
test("handles network timeout")
test("validates required options")
test("retries on transient errors")
```

**Avoid:**
```typescript
test("should extract data when valid URL is provided")  // Too verbose
test("extraction")  // Too vague
```

## Test Structure

### AAA Pattern
```typescript
test("extracts data from valid URL", async () => {
  // Arrange
  const options = { urls: ["https://example.com"] };
  
  // Act
  const result = await runExtraction(sdk, options);
  
  // Assert
  expect(result).toBeDefined();
  expect(result.workflowId).toBeDefined();
});
```

### Setup and Teardown
```typescript
describe("Extraction", () => {
  let sdk: KadoaSDK;
  
  beforeAll(() => {
    sdk = initializeSdk(config);
  });
  
  afterAll(() => {
    dispose(sdk);
  });
  
  test("extracts data", async () => {
    // test implementation
  });
});
```

## Assertions

Keep assertions simple and readable:
```typescript
// Good
expect(result).toBeDefined();
expect(result.status).toBe("success");
expect(result.data.length).toBeGreaterThan(0);

// Avoid
expect(result).not.toBeNull();  // Use toBeDefined() instead
expect(result?.data?.length > 0).toBe(true);  // Use toBeGreaterThan()
```

## Test Data

### Constants
Define at module level:
```typescript
const TEST_API_KEY = process.env.KADOA_API_KEY || "default-test-key";
const TEST_BASE_URL = process.env.KADOA_BASE_URL || "http://localhost:12380";
const TEST_TIMEOUT = 30000;
```

### Fixtures
Store reusable test data:
```typescript
// test/fixtures/extraction.ts
export const validExtractionOptions = {
  urls: ["https://sandbox.kadoa.com/careers"],
  maxPages: 10,
};

export const mockExtractionResponse = {
  workflowId: "test-workflow-123",
  status: "success",
  data: [/* ... */],
};
```

## Async Tests

Always use async/await for clarity:
```typescript
// Good
test("extracts data", async () => {
  const result = await runExtraction(sdk, options);
  expect(result).toBeDefined();
});

// Avoid
test("extracts data", (done) => {
  runExtraction(sdk, options).then(result => {
    expect(result).toBeDefined();
    done();
  });
});
```

## Timeouts

Set appropriate timeouts for different test types:
```typescript
// Unit tests (default: 5 seconds)
test("validates options", () => {});

// Integration tests
test("connects to service", async () => {}, { timeout: 10000 });

// E2E tests
test("completes extraction workflow", async () => {}, { timeout: 60000 });
```

## Mocking

Use Bun's built-in mocking:
```typescript
import { mock } from "bun:test";

test("handles API errors", async () => {
  const mockApi = mock(() => {
    throw new Error("API Error");
  });
  
  // Test error handling
});
```

## Running Tests

```bash
# All tests
bun test

# Specific directory
bun test test/unit
bun test test/e2e

# Watch mode
bun test --watch

# Single file
bun test test/e2e/extraction.test.ts
```

## Example Test File

```typescript
import { beforeAll, afterAll, describe, expect, test } from "bun:test";
import type { KadoaSDK } from "../../src";
import { initializeSdk, dispose, runExtraction } from "../../src";

// Test constants
const TEST_URL = "https://sandbox.kadoa.com/careers";
const TEST_TIMEOUT = 60000;

describe("Extraction", () => {
  let sdk: KadoaSDK;
  
  beforeAll(() => {
    sdk = initializeSdk({
      apiKey: process.env.KADOA_API_KEY || "test-key",
      baseUrl: process.env.KADOA_BASE_URL || "http://localhost:12380",
    });
  });
  
  afterAll(() => {
    dispose(sdk);
  });
  
  test("extracts data from valid URL", async () => {
    const result = await runExtraction(sdk, {
      urls: [TEST_URL],
    });
    
    expect(result).toBeDefined();
    expect(result.workflowId).toBeDefined();
    expect(result.data.length).toBeGreaterThan(0);
  }, { timeout: TEST_TIMEOUT });
  
  test("validates empty URLs array", () => {
    expect(() => {
      runExtraction(sdk, { urls: [] });
    }).toThrow("URLs cannot be empty");
  });
});
```

## Anti-patterns to Avoid

❌ **Don't** use nested describe blocks unnecessarily  
❌ **Don't** use verbose test names with "should"  
❌ **Don't** mix test types in the same file  
❌ **Don't** use `.then()` chains - use async/await  
❌ **Don't** hardcode secrets or credentials  
❌ **Don't** rely on test execution order  
❌ **Don't** use kebab-case for test file names