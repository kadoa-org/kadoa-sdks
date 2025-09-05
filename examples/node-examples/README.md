# Kadoa Node.js SDK Examples

This package contains examples for using the Kadoa Node.js SDK.

## Development Setup

### Fast Development Mode (Recommended)

For the best developer experience with hot reload and direct source imports:

```bash
# From the root of the monorepo
bun run dev:node

# Or run SDK and examples separately in two terminals:
# Terminal 1 - Watch and rebuild SDK
bun run dev:node-sdk

# Terminal 2 - Run examples with hot reload
bun run dev:node-examples
```

### How It Works

1. **TypeScript Project References**: The examples directly reference the SDK source code via TypeScript project references
2. **Path Mapping**: During development, `@kadoa/sdk` imports resolve directly to the SDK source files (no build needed)
3. **Hot Reload**: Bun's `--hot` flag enables instant reloading when you modify example files
4. **Source Maps**: Full source map support for debugging across package boundaries

### Available Scripts

- `bun run dev` - Run examples with file watching
- `bun run dev:hot` - Run examples with hot reload (faster)

### Direct Source Import

Thanks to the path mapping configuration, you can import directly from the SDK source during development:

```typescript
import { initializeApp } from "@kadoa/sdk"; // Maps to ../../sdks/node/src/index.ts
```

This eliminates the need to rebuild the SDK after every change during development.

## Running Examples

1. Create a `.env` file with your API credentials:
```env
KADOA_API_KEY=your_api_key
KADOA_API_URL=your_api_url
```

2. Run the extraction example:
```bash
bun run dev
```