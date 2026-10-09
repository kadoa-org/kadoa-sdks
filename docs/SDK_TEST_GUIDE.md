# SDK Test Guide

Test architecture, patterns, and coverage for SDK maintainers.

See [SDK_API_REFERENCE.md](./SDK_API_REFERENCE.md) for API parity tables.

---

## 1. Test Architecture

### 1.1 Test File Structure

Both SDKs maintain parallel test file structure:

| Test Area | Node | Python |
|-----------|------|--------|
| Client | `kadoa-client.test.ts` | `test_kadoa_client.py` |
| User | `user.test.ts` | `test_user.py` |
| Workflows | `workflows.test.ts` | `test_workflows.py` |
| Extraction Builder | `extraction-builder.test.ts` | `test_extraction_builder.py` |
| Realtime | `realtime-extraction.test.ts` | `test_realtime_extraction.py` |

docs_snippets test files include:

- `introduction`, `schemas`, `workflows`, `notifications`, `webhooks`, `data-delivery`, `data-quality`, `websockets`

### 1.2 Data Access Patterns

Tests cluster by data access pattern:

| Cluster | Pattern | Tests |
|---------|---------|-------|
| Docs Snippets | Shared + Isolated | Read shared fixture, create per-test resources |
| Workflows | Mixed | Updates use shared fixture, deletes use isolated |
| Extraction Builder | Fully isolated | Each test creates own workflow |
| Realtime | Isolated | Self-contained workflow creation |

### 1.3 Fixture Utilities

#### Shared Fixtures

Use for read-only tests. Fixtures seed once and cache for all tests.

**Node** (`sdks/node/test/utils/shared-fixtures.ts`):

```typescript
import { clearFixtureCache, getSharedWorkflowFixture } from "../utils/shared-fixtures";

// Get workflow fixture
const workflow = await getSharedWorkflowFixture(client, { runJob: true });
// Returns: { workflowId, jobId? }

// Clear cache (for watch mode)
clearFixtureCache();
```

**Python** (`sdks/python/tests/utils/shared_fixtures.py`):

```python
from tests.utils.shared_fixtures import clear_fixture_cache, get_shared_workflow_fixture

# Get workflow fixture
workflow = get_shared_workflow_fixture(client, run_job=True)
# Returns: SharedWorkflowFixture(workflow_id, job_id)

# Clear cache
clear_fixture_cache()
```

Fixture names (deterministic):

| Fixture | Name |
|---------|------|
| Read-only workflow | `shared-fixture-workflow-readonly` |

### 1.4 Seeder Utilities

Use for per-test isolation. Seeders check existence before creating.

**Node** (`sdks/node/test/utils/seeder.ts`):

```typescript
seedWorkflow({ name: "test-workflow" }, client)   // Returns { workflowId, jobId? }
```

**Python** (`sdks/python/tests/utils/seeder.py`):

```python
seed_workflow("test-workflow", client, run_job=True)  # Returns { "workflow_id", "job_id" }
```

Parameter style differences:

| Parameter | Node | Python |
|-----------|------|--------|
| name | Object: `{ name }` | String: `name` |
| runJob | `{ runJob: true }` | `run_job=True` |
| Return keys | camelCase | snake_case |

### 1.5 Parallelization Rules

| Cluster | Within File | Across Files | Notes |
|---------|-------------|--------------|-------|
| Docs Snippets | Safe | Safe | Module fixtures |
| Workflows (updates) | Safe | Safe | Shared fixture |
| Workflows (delete) | Unsafe | Unsafe | Needs per-test fixture |
| Extraction Builder | Safe | Safe | Self-contained |
| Realtime | Safe | Safe | Self-contained |

---

## 2. Test Patterns

### 2.1 Read-Only Tests (Shared Fixtures)

Use shared fixtures for tests that only read data:

```typescript
// Node
import { getSharedWorkflowFixture, type SharedWorkflowFixture } from "../utils/shared-fixtures";

let fixture: SharedWorkflowFixture;

beforeAll(async () => {
  fixture = await getSharedWorkflowFixture(client);
});

test("gets the workflow", async () => {
  const workflow = await client.workflow.get(fixture.workflowId);
  // ...
});
```

```python
# Python
from tests.utils.shared_fixtures import get_shared_workflow_fixture

@pytest.fixture(scope="module")
def fixture(client):
    return get_shared_workflow_fixture(client)

def test_gets_workflow(client, fixture):
    workflow = client.workflow.get(fixture.workflow_id)
```

### 2.2 Isolated Write Tests

Each test creates its own resources:

```typescript
// Node
test("creates extraction with custom schema", async () => {
  const { workflowId } = await extraction.create({
    url: "https://example.com",
    extraction: (builder) => builder.entity("Product").field("name", "string"),
  });
  // Test owns this workflow
});
```

```python
# Python
def test_creates_extraction_with_custom_schema(client):
    result = client.extract({
        "url": "https://example.com",
        "extraction": lambda builder: builder.entity("Product").field("name", "string"),
    })
    # Test owns this workflow
```

### 2.3 Mixed Pattern Tests (Nested Describes)

Use nested describe/class groups when tests have different fixture requirements:

**Node (Bun test):**

```typescript
describe("Workflows", () => {
  let client: KadoaClient;

  beforeAll(() => { client = new KadoaClient({ ... }); });
  afterAll(() => { client?.dispose(); });

  describe("Read Operations", () => {
    let fixture: SharedWorkflowFixture;
    beforeAll(async () => {
      fixture = await getSharedWorkflowFixture(client);
    });

    test("updates limit", async () => {
      await client.workflow.update(fixture.workflowId, { limit: 100 });
    });
  });

  describe("Destructive Operations", () => {
    test("deletes workflow", async () => {
      const { workflowId } = await seedWorkflow({ name: `delete-${Date.now()}` }, client);
      await client.workflow.delete(workflowId);
    });
  });
});
```

**Python (pytest):**

```python
@pytest.fixture(scope="module")
def client():
    client = KadoaClient(...)
    yield client
    client.dispose()

@pytest.mark.e2e
class TestWorkflowReadOperations:
    @pytest.fixture(scope="class")
    def fixture(self, client):
        return get_shared_workflow_fixture(client)

    def test_updates_limit(self, client, fixture):
        client.workflow.update(fixture.workflow_id, ...)

@pytest.mark.e2e
class TestWorkflowDestructiveOperations:
    def test_deletes_workflow(self, client):
        result = seed_workflow(f"delete-{int(time.time() * 1000)}", client)
        client.workflow.delete(result["workflow_id"])
```

### 2.4 Cleanup Patterns

**Per-test cleanup (recommended for write tests):**

Use shared cleanup helpers from `cleanup-helpers.ts`:

```typescript
// Node - import shared helpers
import { deleteWorkflowByName, deleteSchemaByName, deleteChannelByName } from "../utils/cleanup-helpers";

it("creates schema", async () => {
  const schemaName = "Product Schema";
  await deleteSchemaByName(schemaName, client);  // Pre-cleanup

  const schema = await client.schema.createSchema({ name: schemaName, ... });
  expect(schema.id).toBeDefined();

  await client.schema.deleteSchema(schema.id);  // Post-cleanup
});
```

```python
# Python
async def delete_schema_by_name(name: str, client):
    schemas = await client.schema.list_schemas()
    existing = next((s for s in schemas if s.name == name), None)
    if existing and existing.id:
        await client.schema.delete_schema(existing.id)

async def test_creates_schema(client):
    schema_name = "Product Schema"
    await delete_schema_by_name(schema_name, client)  # Pre-cleanup

    schema = await client.schema.create_schema({"name": schema_name, ...})
    assert schema.id is not None

    await client.schema.delete_schema(schema.id)  # Post-cleanup
```

**Benefits:**
- Tests are idempotent (safe to re-run)
- No shared state between tests
- Cleanup happens immediately, not deferred
- Clear per-test responsibility

**Alternative: Unique naming:**

```typescript
const { workflowId } = await seedWorkflow(
  { name: `test-workflow-${Date.now()}` },
  client,
);
```

---

## 3. Test Coverage

### 3.1 Core Tests

| Test File | Verified Operations |
|-----------|---------------------|
| kadoa-client | `client.status()` |
| user | `getCurrentUser()`, invalid API key handling |
| workflows | `update()` (limit, name), `delete()`, additionalData validation |
| extraction-builder | default extraction, raw extraction, custom schema, hybrid, classification, additionalData |
| realtime-extraction | WebSocket connection, event subscription |

### 3.2 docs_snippets Tests

Each test uses naming format `<LANG>-<FEATURE>-<NUMBER>` for documentation extraction:

| File | Snippet Coverage |
|------|------------------|
| introduction | Quick start, builder pattern |
| schemas | Builder API, CRUD operations, classification, metadata |
| workflows | Authentication, extraction modes, scheduling, pagination |
| notifications | Workflow setup, WebSocket, channel management |
| webhooks | Quick setup, channel management |
| data-delivery | Fetch patterns |
| data-quality | Set, read, and remove per-field rules |
| websockets | Real-time updates |

### 3.3 Known Discrepancies

**Test structure differences:**

| Area | Node | Python |
|------|------|--------|
| Bulk operations | Single test with create/approve/delete | Separate tests |
| Delete verification | Checks `state === "DELETED"` | Checks not in list |
| Schema creation | Simple object literals | Wrapped types (`SchemaField`, `DataField`) |

**Callback signatures:**

| Feature | Node | Python |
|---------|------|--------|
| `onConnection` | `(connected) => ...` | `(connected, reason=None) => ...` |

**Async patterns:**

Some Python tests are async where Node equivalents are sync. This reflects language idioms.
