# Kadoa SDK for Python

Official Python SDK for the Kadoa API, providing easy integration with Kadoa's web data extraction platform.

## Installation

```bash
pip install kadoa-sdk
```

## Getting Started

### Obtaining an API Key

1. Register at [kadoa.com](https://www.kadoa.com/)
2. Navigate to your [account page](https://www.kadoa.com/account)
3. Copy your API key

### Quick Start

```python
from kadoa_sdk import initialize_app, run_extraction, KadoaSdkConfig, ExtractionOptions

# Initialize the SDK
app = initialize_app(KadoaSdkConfig(
    api_key="your-api-key"
))

# Run an extraction
result = run_extraction(app, ExtractionOptions(
    urls=["https://example.com"],
    name="My Extraction Workflow"
))

if result:
    print(f"Workflow created with ID: {result.workflow_id}")
```

## Configuration

### Basic Configuration

```python
app = initialize_app(KadoaSdkConfig(
    api_key="your-api-key",
    base_url="https://api.kadoa.com",  # optional
    timeout=30                         # optional, in seconds
))
```

### Using Environment Variables

```env
KADOA_API_KEY=your-api-key
KADOA_API_URL=https://api.kadoa.com
KADOA_TIMEOUT=30
```

```python
import os
from dotenv import load_dotenv
from kadoa_sdk import initialize_app, KadoaSdkConfig

load_dotenv()

app = initialize_app(KadoaSdkConfig(
    api_key=os.environ["KADOA_API_KEY"],
    base_url=os.environ.get("KADOA_API_URL", "https://api.kadoa.com"),
    timeout=int(os.environ.get("KADOA_TIMEOUT", "30"))
))
```

## Event Handling

```python
from kadoa_sdk import initialize_app, KadoaSdkConfig

app = initialize_app(KadoaSdkConfig(api_key="your-api-key"))

# Listen to events
def on_event(event):
    print(f"Event: {event.name} at {event.timestamp}")
    if event.data:
        print(f"Data: {event.data}")

app.on_event(on_event)

# Event types:
# - entity:detected
# - extraction:started
# - extraction:status_changed
# - extraction:data_available
# - extraction:completed
```

## API Reference

### initialize_app(config: KadoaSdkConfig)
- `api_key` (required): Your Kadoa API key
- `base_url` (optional): API base URL
- `timeout` (optional): Request timeout in seconds

Returns an app instance with configured API client.

### run_extraction(app, options: ExtractionOptions)
- `urls`: List of URLs to extract from
- `name`: Workflow name
- Additional options available in API documentation

## Examples

See [examples directory](https://github.com/kadoa-org/kadoa-sdks/tree/main/examples/python-examples) for more usage examples.

## Requirements

- Python 3.8+

## License

MIT

## Support

- Documentation: [docs.kadoa.com](https://docs.kadoa.com)
- Support: [support@kadoa.com](mailto:support@kadoa.com)
- Issues: [GitHub Issues](https://github.com/kadoa-org/kadoa-sdks/issues)
- Changelog: [CHANGELOG.md](./CHANGELOG.md)
