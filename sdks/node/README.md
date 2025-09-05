# Kadoa SDK for Node.js

Official Node.js/TypeScript SDK for the Kadoa API, providing easy integration with Kadoa's web data extraction platform.

## Installation

```bash
npm install @kadoa/node-sdk axios
# or
yarn add @kadoa/node-sdk axios
# or
pnpm add @kadoa/node-sdk axios
```

**Note:** `axios` is required as a peer dependency.

## Quick Start

```typescript
import { initializeSdk, runExtraction } from '@kadoa/node-sdk';

// Initialize the SDK
const sdk = initializeSdk({
  apiKey: 'your-api-key'
});

// Run an extraction
const result = await runExtraction(sdk, {
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
const sdk = initializeSdk({
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
import { initializeSdk } from '@kadoa/node-sdk';
import { config } from 'dotenv';

config();

const sdk = initializeSdk({
  apiKey: process.env.KADOA_API_KEY!,
  baseUrl: process.env.KADOA_API_URL,
  timeout: parseInt(process.env.KADOA_TIMEOUT || '30000')
});
```

## Event Handling

```typescript
const sdk = initializeSdk({ apiKey: 'your-api-key' });

// Listen to events
sdk.onEvent((event) => {
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

### initializeSdk(config)
- `apiKey` (required): Your Kadoa API key
- `baseUrl` (optional): API base URL
- `timeout` (optional): Request timeout in milliseconds

Returns an SDK instance with:
- `configuration`: Current configuration
- `axiosInstance`: Configured HTTP client
- `onEvent()`: Subscribe to events
- `offEvent()`: Unsubscribe from events

### runExtraction(sdk, options)
- `urls`: Array of URLs to extract from
- `name`: Workflow name
- Additional options available in API documentation

## Examples

See [examples directory](https://github.com/kadoa-org/kadoa-sdks/tree/main/examples/node-examples) for more usage examples.

## Requirements

- Node.js 18+
- TypeScript 5+ (for TypeScript projects)

## License

MIT

## Support

- Documentation: [docs.kadoa.com](https://docs.kadoa.com)
- Support: [support@kadoa.com](mailto:support@kadoa.com)
- Issues: [GitHub Issues](https://github.com/kadoa-org/kadoa-sdks/issues)