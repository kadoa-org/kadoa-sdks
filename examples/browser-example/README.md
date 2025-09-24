# Kadoa SDK Browser Example

A simple example showing how to use the Kadoa SDK in a browser to fetch user information and workflows.

## Setup

1. **Build the SDK**:
   ```bash
   cd ../../sdks/node
   npm run build
   ```

2. **Start a local server** from the project root:
   ```bash
   python3 -m http.server 8000
   ```

3. **Open your browser**: Go to `http://localhost:8000/examples/browser-example/`

## Usage

1. Enter your Kadoa API key
2. Click "Fetch User Info & Workflows"
3. View your user information and workflows

**Note**: If you see an error about the SDK not being loaded, make sure you've built the SDK first!

## Code Example

```javascript
// Initialize the client
const client = new KadoaSDK.KadoaClient({
    apiKey: 'your-api-key'
});

// Fetch user information
const user = await client.user.getCurrentUser();
console.log(user); // { userId, email, featureFlags }

// Fetch workflows
const workflows = await client.workflows.list();
console.log(workflows); // Array of workflow objects
```

## Files

- `index.html` - The example page
- `README.md` - This file

The SDK is loaded directly from `/sdks/node/dist/browser/index.global.js` - no copying needed!

That's it! Simple and focused on the essential usage.