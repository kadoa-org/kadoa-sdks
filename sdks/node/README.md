# Kadoa SDK for Node.js

Official Node.js/TypeScript SDK for the Kadoa API, providing easy integration with Kadoa's web data extraction platform.

## Installation

```bash
npm install @kadoa/node-sdk
# or
yarn add @kadoa/node-sdk
# or
pnpm add @kadoa/node-sdk
```

## Quick Start

```typescript
import { KadoaClient } from '@kadoa/node-sdk';

const client = new KadoaClient({
  apiKey: 'your-api-key'
});

// AI automatically detects and extracts data
const result = await client.extraction.run({
  urls: ['https://example.com/products'],
  name: 'Product Extraction'
});

console.log(`Extracted ${result.data?.length} items`);
// Output: Extracted 25 items
```

## Extraction Methods

### Auto-Detection

The simplest way to extract data - AI automatically detects structured content:

```typescript
const result = await client.extraction.run({
  urls: ['https://example.com'],
  name: 'My Extraction'
});

// Returns:
// {
//   workflowId: "abc123",
//   workflow: { id: "abc123", state: "FINISHED", ... },
//   data: [
//     { title: "Item 1", price: "$10" },
//     { title: "Item 2", price: "$20" }
//   ],
//   pagination: { page: 1, totalPages: 3, hasMore: true }
// }
```

**When to use:** Quick extractions, exploratory data gathering, or when you don't know the exact schema.

### Builder API (Custom Schemas)

Define exactly what data you want to extract using the fluent builder pattern:

```typescript
const extraction = await client.extract({
  urls: ['https://example.com/products'],
  name: 'Product Extraction',
  extraction: builder => builder
    .schema('Product')
    .field('title', 'Product name', 'STRING', { example: 'Laptop' })
    .field('price', 'Product price', 'CURRENCY')
    .field('inStock', 'Stock status', 'BOOLEAN')
    .field('rating', 'Star rating', 'NUMBER')
}).create();

// Run extraction
const result = await extraction.run();
const data = await result.fetchData({});

// Returns:
// {
//   data: [
//     { title: "Dell XPS", price: "$999", inStock: true, rating: 4.5 },
//     { title: "MacBook", price: "$1299", inStock: false, rating: 4.8 }
//   ],
//   pagination: { ... }
// }
```

**When to use:** Production applications, consistent schema requirements, data validation needs.

#### Builder Patterns

**Raw Content Extraction**

Extract page content without structure transformation:

```typescript
// Single format
extraction: builder => builder.raw('markdown')

// Multiple formats
extraction: builder => builder.raw(['html', 'markdown', 'url'])
```

**Classification Fields**

Categorize content into predefined labels:

```typescript
extraction: builder => builder
  .schema('Article')
  .classify('sentiment', 'Content sentiment', [
    { title: 'Positive', definition: 'Optimistic or favorable tone' },
    { title: 'Negative', definition: 'Critical or unfavorable tone' },
    { title: 'Neutral', definition: 'Balanced or objective tone' }
  ])
```

**Hybrid Extraction**

Combine structured fields with raw content:

```typescript
extraction: builder => builder
  .schema('Product')
  .field('title', 'Product name', 'STRING', { example: 'Item' })
  .field('price', 'Product price', 'CURRENCY')
  .raw('html')  // Include raw HTML alongside structured fields
```

**Reference Existing Schema**

Reuse a previously defined schema:

```typescript
extraction: builder => builder.useSchema('schema-id-123')
```

### Real-time Monitoring

Monitor websites continuously and receive live updates when data changes.

**Setup:**

```typescript
// Enable real-time with API key
const client = new KadoaClient({
  apiKey: 'your-api-key',
  enableRealtime: true
});

// Verify connection
if (client.isRealtimeConnected()) {
  console.log('Connected to real-time updates');
}
```

**Create a monitor:**

```typescript
const monitor = await client
  .extract({
    urls: ['https://example.com/products'],
    name: 'Price Monitor',
    extraction: schema =>
      schema
        .entity('Product')
        .field('name', 'Product name', 'STRING')
        .field('price', 'Current price', 'MONEY'),
  })
  .setInterval({ interval: 'REAL_TIME' })
  .create();

// Wait for monitor to start
await monitor.waitForReady();

// Handle updates
client.realtime?.onEvent((event) => {
  if (event.workflowId === monitor.workflowId) {
    console.log('Update:', event.data);
  }
});
```

**Requirements:**
- API key (personal or team)
- `enableRealtime: true` in client configuration
- Notifications enabled for at least one channel ( Webhook, Email, or Slack)

**When to use:** Price tracking, inventory monitoring, live content updates.

### Working with Results

**Fetch Specific Page**

```typescript
const page = await client.extraction.fetchData({
  workflowId: 'workflow-id',
  page: 2,
  limit: 50
});
```

**Iterate Through All Pages**

```typescript
for await (const page of client.extraction.fetchDataPages({
  workflowId: 'workflow-id'
})) {
  console.log(`Processing ${page.data.length} items`);
  // Process page.data
}
```

**Fetch All Data at Once**

```typescript
const allData = await client.extraction.fetchAllData({
  workflowId: 'workflow-id'
});

console.log(`Total items: ${allData.length}`);
```

### Advanced Workflow Control

For scheduled extractions, monitoring, and notifications:

```typescript
const extraction = await client.extract({
  urls: ['https://example.com'],
  name: 'Scheduled Extraction',
  extraction: builder => builder
    .schema('Product')
    .field('title', 'Product name', 'STRING', { example: 'Item' })
    .field('price', 'Price', 'CURRENCY')
})
.setInterval({ interval: 'DAILY' })  // Schedule: HOURLY, DAILY, WEEKLY, MONTHLY
.withNotifications({
  events: 'all',
  channels: { WEBSOCKET: true }
})
.bypassPreview()  // Skip approval step
.create();

const result = await extraction.run();
```

## Data Validation

Kadoa can automatically suggest validation rules and detect anomalies:

```typescript
import { KadoaClient, pollUntil } from '@kadoa/node-sdk';

const client = new KadoaClient({ apiKey: 'your-api-key' });

// 1. Run extraction
const result = await client.extraction.run({
  urls: ['https://example.com']
});

// 2. Wait for AI-suggested validation rules
const rules = await pollUntil(
  async () => await client.validation.listRules({
    workflowId: result.workflowId
  }),
  (result) => result.data.length > 0,
  { pollIntervalMs: 1000, timeoutMs: 30000 }
);

// 3. Approve and run validation
await client.validation.bulkApproveRules({
  workflowId: result.workflowId,
  ruleIds: rules.result.data.map(r => r.id)
});

const validation = await client.validation.scheduleValidation(
  result.workflowId,
  result.workflow?.jobId || ''
);

// 4. Check for anomalies
const completed = await client.validation.waitUntilCompleted(
  validation.validationId
);
const anomalies = await client.validation.getValidationAnomalies(
  validation.validationId
);

console.log(`Found ${anomalies.length} anomalies`);
```

## Configuration

### Basic Setup

```typescript
const client = new KadoaClient({
  apiKey: 'your-api-key',
  timeout: 30000  // optional, in ms
});
```

### Environment Variables

```typescript
import { KadoaClient } from '@kadoa/node-sdk';
import { config } from 'dotenv';

config();

const client = new KadoaClient({
  apiKey: process.env.KADOA_API_KEY!
});
```

### WebSocket & Realtime Events

Enable realtime notifications using an API key:

```typescript
const client = new KadoaClient({
  apiKey: 'your-api-key',
  enableRealtime: true
});

// Listen to events
client.realtime?.onEvent((event) => {
  console.log('Event:', event);
});

// Use with extractions
const extraction = await client.extract({
  urls: ['https://example.com'],
  name: 'Monitored Extraction',
  extraction: builder => builder.raw('markdown')
})
.withNotifications({
  events: 'all',
  channels: { WEBSOCKET: true }
})
.create();
```

**Connection control:**

```typescript
const realtime = client.connectRealtime();      // Connect manually
const connected = client.isRealtimeConnected(); // Check status
client.disconnectRealtime();                    // Disconnect
```

## Error Handling

```typescript
import { KadoaClient, KadoaSdkException, KadoaHttpException } from '@kadoa/node-sdk';

try {
  const result = await client.extraction.run({
    urls: ['https://example.com']
  });
} catch (error) {
  if (error instanceof KadoaHttpException) {
    console.error('API Error:', error.message);
    console.error('Status:', error.httpStatus);
  } else if (error instanceof KadoaSdkException) {
    console.error('SDK Error:', error.message);
    console.error('Code:', error.code);
  }
}
```

## Debugging

Enable debug logs using the `DEBUG` environment variable:

```bash
# All SDK logs
DEBUG=kadoa:* node app.js

# Specific modules
DEBUG=kadoa:extraction node app.js
DEBUG=kadoa:http node app.js
DEBUG=kadoa:client,kadoa:extraction node app.js
```

## More Examples

See the [examples directory](https://github.com/kadoa-org/kadoa-sdks/tree/main/examples/node-examples) for complete examples including:
- Batch processing
- Custom error handling
- Integration patterns
- Advanced validation workflows

## Workflow Management

Use the workflows domain to inspect or modify existing workflows without leaving your application.

### Update Workflow Metadata

Wraps `PUT /v4/workflows/{workflowId}/metadata` so you can adjust limits, schedules, tags, schema, monitoring, etc.

```typescript
const result = await client.workflow.update("workflow-id", {
  limit: 1000,
  monitoring: { enabled: true },
  tags: ["weekly-report"],
});

console.log(result);
// { success: true, message: "Workflow metadata updated successfully" }
```

### Delete a Workflow

```typescript
await client.workflow.delete("workflow-id");
```

> [!NOTE]
> `client.workflow.cancel(id)` still calls the delete endpoint for backward compatibility, but it now logs a deprecation warning. Use `client.workflow.delete(id)` going forward.

## Requirements

- Node.js 22+

## Support

- **Documentation:** [docs.kadoa.com](https://docs.kadoa.com)
- **API Reference:** [docs.kadoa.com/api](https://docs.kadoa.com/api)
- **Support:** [support@kadoa.com](mailto:support@kadoa.com)
- **Issues:** [GitHub Issues](https://github.com/kadoa-org/kadoa-sdks/issues)

## License

MIT
