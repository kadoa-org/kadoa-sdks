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
from kadoa_sdk import initialize_sdk, run_extraction, KadoaSdkConfig, ExtractionOptions

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kadoa_sdk.examples")

# Initialize the SDK
sdk = initialize_sdk(KadoaSdkConfig(
    api_key="your-api-key"
))

# Run an extraction
result = run_extraction(sdk, ExtractionOptions(
    urls=["https://example.com"],
    name="My Extraction Workflow"
))

if result:
    logger.info("Workflow created with ID: %s", result.workflow_id)
```

## Configuration

### Basic Configuration

```python
sdk = initialize_sdk(KadoaSdkConfig(
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
from kadoa_sdk import initialize_sdk, KadoaSdkConfig

load_dotenv()

sdk = initialize_sdk(KadoaSdkConfig(
    api_key=os.environ["KADOA_API_KEY"],
    base_url=os.environ.get("KADOA_API_URL", "https://api.kadoa.com"),
    timeout=int(os.environ.get("KADOA_TIMEOUT", "30"))
))
```

## Event Handling

```python
import logging
from kadoa_sdk import initialize_sdk, KadoaSdkConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kadoa_sdk.examples")

sdk = initialize_sdk(KadoaSdkConfig(api_key="your-api-key"))

# Listen to events with a lambda and log output
sdk.on_event(lambda e: logger.info("event: %s", e.to_dict()))

# Event types:
# - entity:detected
# - extraction:started
# - extraction:status_changed
# - extraction:data_available
# - extraction:completed
```

## API Reference

### initialize_sdk(config: KadoaSdkConfig)
- `api_key` (required): Your Kadoa API key
- `base_url` (optional): API base URL
- `timeout` (optional): Request timeout in seconds

Returns an sdk instance with configured API client.

### run_extraction(sdk, options: ExtractionOptions)
- `urls`: List of URLs to extract from
- `name`: Workflow name
- Additional options available in API documentation

### dispose(sdk: KadoaSdk)
Releases resources and removes all event listeners.

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
