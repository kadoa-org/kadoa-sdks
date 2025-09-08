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

### Using Environment Variables

```env
KADOA_API_KEY=your-api-key
KADOA_API_URL=https://api.kadoa.com
KADOA_TIMEOUT=30000
```

```typescript
import { KadoaClient } from '@kadoa/node-sdk';
import { config } from 'dotenv';

config();

const client = new KadoaClient({
  apiKey: process.env.KADOA_API_KEY!,
  baseUrl: process.env.KADOA_API_URL,
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
```

## API Reference

### new KadoaClient(config)
- `apiKey` (required): Your Kadoa API key
- `baseUrl` (optional): API base URL (default: 'https://api.kadoa.com')
- `timeout` (optional): Request timeout in milliseconds (default: 30000)

Returns a client instance with:
- `extraction`: Extraction module with `run()` method
- `onEvent()`: Subscribe to events
- `offEvent()`: Unsubscribe from events
- `dispose()`: Releases resources and removes all event listeners

### client.extraction.run(options)
- `urls`: Array of URLs to extract from
- `name`: Workflow name
- Additional options available in API documentation

## Examples

See [examples directory](https://github.com/kadoa-org/kadoa-sdks/tree/main/examples/node-examples) for more usage examples.

## Requirements

- Node.js 22+

## License

MIT

## Support

- Documentation: [docs.kadoa.com](https://docs.kadoa.com)
- Support: [support@kadoa.com](mailto:support@kadoa.com)
- Issues: [GitHub Issues](https://github.com/kadoa-org/kadoa-sdks/issues)