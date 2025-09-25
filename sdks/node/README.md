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

// Initialize the client
const client = new KadoaClient({
  apiKey: 'your-api-key'
});

// Run an extraction
const result = await client.extraction.run({
  urls: ['https://example.com'],
  name: 'My Extraction Workflow'
});

if (result) {
  console.log(`Workflow created with ID: ${result.workflowId}`);
}
```

## Configuration

### Basic Configuration

```typescript
const client = new KadoaClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.kadoa.com', // optional
  timeout: 30000                    // optional, in ms
});
```

### Realtime Configuration

To enable WebSocket connections for realtime events, use a team API key (starting with `tk-`):

```typescript
const client = new KadoaClient({
  apiKey: 'tk-your-team-api-key',  // Must be a team API key
  enableRealtime: true,
  realtimeConfig: {
    autoConnect: true,      // optional, default: true
    reconnectDelay: 5000,   // optional, default: 5000ms
    heartbeatInterval: 10000 // optional, default: 10000ms
  }
});
```

### Using Environment Variables

```env
KADOA_API_KEY=your-api-key
KADOA_TEAM_API_KEY=tk-your-team-api-key  # For realtime features (optional)
KADOA_PUBLIC_API_URI=https://api.kadoa.com
KADOA_TIMEOUT=30000
DEBUG=kadoa:*  # Enable all SDK debug logs (optional)
```

```typescript
import { KadoaClient } from '@kadoa/node-sdk';
import { config } from 'dotenv';

config();

const client = new KadoaClient({
  apiKey: process.env.KADOA_API_KEY!,
  baseUrl: process.env.KADOA_PUBLIC_API_URI,
  timeout: parseInt(process.env.KADOA_TIMEOUT || '30000')
});
```

## Event Handling

```typescript
const client = new KadoaClient({ apiKey: 'your-api-key' });

// Listen to events
client.onEvent((event) => {
  console.log('Event:', event);
});

// Event types:
// - entity:detected
// - extraction:started
// - extraction:status_changed
// - extraction:data_available
// - extraction:completed
// - realtime:connected (when WebSocket enabled)
// - realtime:disconnected
// - realtime:event
// - realtime:heartbeat
// - realtime:error
```

### Realtime Events

When realtime is enabled with a team API key:

```typescript
const client = new KadoaClient({
  apiKey: 'tk-your-team-api-key',
  enableRealtime: true
});

// Listen to realtime events
client.onEvent((event) => {
  if (event.type === 'realtime:event') {
    console.log('Received realtime data:', event.payload.data);
  }
});

// Manual connection control
const realtime = client.connectRealtime();

// Check connection status
if (client.isRealtimeConnected()) {
  console.log('Connected to realtime server');
}

// Disconnect when done
client.disconnectRealtime();
```

## Debug Logging

The SDK uses the [debug](https://www.npmjs.com/package/debug) package for logging, which is disabled by default. Enable debug logs using the `DEBUG` environment variable:

```bash
# Enable all Kadoa SDK logs
DEBUG=kadoa:* node app.js

# Enable specific modules
DEBUG=kadoa:client node app.js          # Client operations only
DEBUG=kadoa:wss node app.js             # WebSocket logs only
DEBUG=kadoa:extraction node app.js      # Extraction module logs
DEBUG=kadoa:http node app.js            # HTTP request/response logs
DEBUG=kadoa:workflow node app.js        # Workflow operations

# Enable multiple modules
DEBUG=kadoa:client,kadoa:extraction node app.js
```

## Examples

### Basic Extraction

```typescript
import { KadoaClient } from '@kadoa/node-sdk';

const client = new KadoaClient({
  apiKey: 'your-api-key'
});

// Run an extraction
const result = await client.extraction.run({
  urls: ['https://sandbox.kadoa.com/ecommerce'],
  name: 'My Extraction Workflow'
});

// Fetch paginated data
if (result.workflowId) {
  const page1 = await client.extraction.fetchData({
    workflowId: result.workflowId,
    page: 1
  });

  console.log('Data:', page1.data?.slice(0, 5));
  console.log('Pagination:', page1.pagination);
}
```

### WebSocket Events with Notifications

```typescript
// Initialize client with team API key for realtime features
const client = new KadoaClient({
  apiKey: 'tk-your-team-api-key',
  enableRealtime: true,
});

// Listen to realtime events
client.realtime?.onEvent((event) => {
  console.log('Event received:', event);
});

// List available notification events
const availableEvents = await client.notification.settings.listAllEvents();

// Run extraction with notifications
const result = await client.extraction.run({
  urls: ['https://sandbox.kadoa.com/ecommerce'],
  notifications: {
    events: 'all', // or subset of availableEvents
    channels: {
      WEBSOCKET: true,
    },
  },
});
```

### Data Validation with Rules

```typescript
import { KadoaClient, pollUntil } from '@kadoa/node-sdk';

const client = new KadoaClient({ apiKey: 'your-api-key' });

// 1. Run an extraction
const result = await client.extraction.run({
  urls: ['https://sandbox.kadoa.com/ecommerce'],
});

// 2. Wait for automatic rule suggestions
const rulesResult = await pollUntil(
  async () => await client.validation.listRules({
    workflowId: result.workflowId,
  }),
  (result) => result.data.length > 0,
  { pollIntervalMs: 1000, timeoutMs: 30000 }
);

// 3. Approve suggested rules
const approvedRules = await client.validation.bulkApproveRules({
  workflowId: result.workflowId,
  ruleIds: rulesResult.result.data.map(rule => rule.id),
});

// 4. Run validation check
const validation = await client.validation.scheduleValidation(
  result.workflowId,
  result.workflow?.jobId || ''
);

// 5. Wait for completion and check anomalies
const completed = await client.validation.waitUntilCompleted(
  validation.validationId
);

const anomalies = await client.validation.getValidationAnomalies(
  validation.validationId
);

console.log('Validation anomalies:', anomalies);
```

### Complete Example

```typescript
import assert from 'node:assert';
import { KadoaClient } from '@kadoa/node-sdk';

async function main() {
  const apiKey = process.env.KADOA_API_KEY;
  assert(apiKey, 'KADOA_API_KEY is not set');

  const client = new KadoaClient({ apiKey });

  // Run extraction
  const result = await client.extraction.run({
    urls: ['https://sandbox.kadoa.com/ecommerce'],
  });

  // Fetch and display data
  if (result.workflowId) {
    const page1 = await client.extraction.fetchData({
      workflowId: result.workflowId,
      page: 1,
    });

    console.log('Page 1 Data:');
    console.log('--------------------------------');
    console.log(page1.data?.slice(0, 5));
    console.log(page1.pagination);
    console.log('--------------------------------');
  }

  console.log('Initial result:', result.data?.slice(0, 5));
}

main().catch(console.error);
```

### More Examples

See the [examples directory](https://github.com/kadoa-org/kadoa-sdks/tree/main/examples/node-examples) for additional usage examples including:
- Advanced extraction configurations
- Custom validation rules
- Error handling patterns
- Batch processing
- Integration patterns

## Requirements

- Node.js 22+

## License

MIT

## Support

- Documentation: [docs.kadoa.com](https://docs.kadoa.com)
- Support: [support@kadoa.com](mailto:support@kadoa.com)
- Issues: [GitHub Issues](https://github.com/kadoa-org/kadoa-sdks/issues)