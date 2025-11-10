# Kadoa SDK for Python

Official Python SDK for the Kadoa API, providing easy integration with Kadoa's web data extraction platform.

## Installation

We recommend using [`uv`](https://github.com/astral-sh/uv), a fast and modern Python package manager:

```bash
uv add kadoa-sdk
# or
uv pip install kadoa-sdk
```

Alternatively, you can use traditional pip:

```bash
pip install kadoa-sdk
```

**Requirements:** Python 3.12 or higher

## Quick Start

```python
from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.extraction.types import ExtractionOptions

client = KadoaClient(
    KadoaClientConfig(
        api_key='your-api-key'
    )
)

# AI automatically detects and extracts data
result = client.extraction.run(
    ExtractionOptions(
        urls=['https://sandbox.kadoa.com/ecommerce'],
        name='My First Extraction'
    )
)

print(f"Extracted {len(result.data)} items")
```

That's it! With the SDK, data is automatically extracted. For more control, specify exactly what fields you want using the builder API.

## Documentation

For comprehensive documentation, examples, and API reference, visit:

- **[Full Documentation](https://docs.kadoa.com/docs/sdks/)** - Complete guide with examples
- **[API Reference](https://docs.kadoa.com/api)** - Detailed API documentation
- **[GitHub Examples](https://github.com/kadoa-org/kadoa-sdks/tree/main/examples/python-examples)** - Working code examples

## Requirements

- Python 3.12 or higher
- Dependencies are automatically installed

## Support

- **Documentation:** [docs.kadoa.com](https://docs.kadoa.com)
- **Support:** [support@kadoa.com](mailto:support@kadoa.com)
- **Issues:** [GitHub Issues](https://github.com/kadoa-org/kadoa-sdks/issues)

## License

MIT
