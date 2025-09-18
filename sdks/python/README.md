# Kadoa SDK for Python

Official Python SDK for the Kadoa API, providing easy integration with Kadoa's web data extraction platform.

## Installation

We recommend using a virtual environment to avoid dependency conflicts (optional). Use your preferred tool (`venv`, `virtualenv`, `conda`, `poetry`, `uv`).

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install kadoa-sdk
```

## Getting Started

### Obtaining an API Key

1. Register at [kadoa.com](https://www.kadoa.com/)
2. Navigate to your [account page](https://www.kadoa.com/account)
3. Copy your API key

### Quick Start

```python
import logging
from kadoa_sdk import KadoaClient, KadoaClientConfig, ExtractionOptions

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kadoa_sdk.examples")

# Initialize the client
client = KadoaClient(KadoaClientConfig(
    api_key="your-api-key"
))

# Run an extraction
result = client.extraction.run(ExtractionOptions(
    urls=["https://example.com"],
    name="My Extraction Workflow"
))

if result:
    logger.info("Workflow created with ID: %s", result.workflow_id)
```

## Configuration

### Basic Configuration

```python
client = KadoaClient(KadoaClientConfig(
    api_key="your-api-key",
    base_url="https://api.kadoa.com",  # optional
    timeout=30                         # optional, in seconds
))
```

### Using Environment Variables

```env
KADOA_API_KEY=your-api-key
KADOA_PUBLIC_API_URI=https://api.kadoa.com
KADOA_TIMEOUT=30
```

```python
import os
from dotenv import load_dotenv
from kadoa_sdk import KadoaClient, KadoaClientConfig

load_dotenv()

client = KadoaClient(KadoaClientConfig(
    api_key=os.environ["KADOA_API_KEY"],
    base_url=os.environ.get("KADOA_PUBLIC_API_URI", "https://api.kadoa.com"),
    timeout=int(os.environ.get("KADOA_TIMEOUT", "30"))
))
```

## Event Handling

```python
import logging
from kadoa_sdk import KadoaClient, KadoaClientConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kadoa_sdk.examples")

client = KadoaClient(KadoaClientConfig(api_key="your-api-key"))

# Listen to events with a lambda and log output
client.on_event(lambda e: logger.info("event: %s", e.to_dict()))

# Event types:
# - entity:detected
# - extraction:started
# - extraction:status_changed
# - extraction:data_available
# - extraction:completed
```

## API Reference

### KadoaClient(config: KadoaClientConfig)
- `api_key` (required): Your Kadoa API key
- `base_url` (optional): API base URL (default: 'https://api.kadoa.com')
- `timeout` (optional): Request timeout in seconds (default: 30)

Returns a client instance with:
- `extraction`: Extraction module with `run()` method
- `on_event()`: Subscribe to events
- `off_event()`: Unsubscribe from events
- `dispose()`: Releases resources and removes all event listeners

### client.extraction.run(options: ExtractionOptions)
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
