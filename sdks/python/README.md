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

**Requirements:** Python 3.11 or higher

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

## Advanced Examples

### Builder API with Custom Schema

Define exactly what fields to extract using the fluent builder API:

```python
from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.extraction.types import ExtractOptions
from kadoa_sdk.schemas.schema_builder import SchemaBuilder, FieldOptions

client = KadoaClient(KadoaClientConfig(api_key='your-api-key'))

# Define custom schema
extraction = client.extract(
    ExtractOptions(
        urls=['https://example.com/products'],
        name='Product Extraction',
        extraction=lambda schema: (
            schema.entity('Product')
            .field('title', 'Product title', 'STRING')
            .field('price', 'Product price', 'MONEY', FieldOptions(example='$99.99'))
            .field('description', 'Product description', 'STRING')
            .field('image', 'Product image URL', 'IMAGE', FieldOptions(example='https://example.com/image.jpg'))
        )
    )
).create()

# Run and wait for completion
finished = extraction.run()
print(f"Extracted {len(finished.fetch_data().data)} products")
```

### Notifications Setup

Configure notifications to be alerted when workflows complete:

```python
from kadoa_sdk.notifications import NotificationOptions

extraction = client.extract(
    ExtractOptions(
        urls=['https://example.com'],
        name='Monitored Extraction'
    )
).with_notifications(
    NotificationOptions(
        events=['workflow_finished', 'workflow_failed'],
        channels={'email': True}
    )
).create()

finished = extraction.run()
```

### Error Handling

Handle errors gracefully with proper exception types:

```python
from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core import KadoaSdkError, KadoaHttpError
from kadoa_sdk.extraction.types import ExtractionOptions

try:
    result = client.extraction.run(
        ExtractionOptions(
            urls=['https://example.com'],
            name='My Extraction'
        )
    )
except KadoaSdkError as e:
    print(f"SDK Error: {e.message}")
    print(f"Error Code: {e.code}")
    if e.details:
        print(f"Details: {e.details}")
except KadoaHttpError as e:
    print(f"HTTP Error: {e.message}")
    print(f"Status: {e.http_status}")
    print(f"Endpoint: {e.endpoint}")
except Exception as e:
    print(f"Unexpected error: {e}")
```

### Paginated Data Fetching

Fetch data in pages for large datasets:

```python
from kadoa_sdk.extraction.types import FetchDataOptions

# Fetch first page
result = client.extraction.fetch_data(
    FetchDataOptions(
        workflow_id='workflow-123',
        page=1,
        limit=50
    )
)

print(f"Page {result.pagination.page} of {result.pagination.total_pages}")
print(f"Total records: {result.pagination.total_count}")

# Fetch all data automatically
all_data = client.extraction.fetch_all_data(
    FetchDataOptions(workflow_id='workflow-123', limit=100)
)
print(f"Fetched {len(all_data)} total records")
```

### Async Data Fetching

Process large datasets efficiently with async generators:

```python
import asyncio
from kadoa_sdk.extraction.types import FetchDataOptions

async def process_all_pages():
    async for page in client.extraction.fetch_data_pages(
        FetchDataOptions(workflow_id='workflow-123', limit=100)
    ):
        print(f"Processing page {page.pagination.page}")
        for record in page.data:
            # Process each record
            process_record(record)

asyncio.run(process_all_pages())
```

## Documentation

For comprehensive documentation, examples, and API reference, visit:

- **[Full Documentation](https://docs.kadoa.com/docs/sdks/)** - Complete guide with examples
- **[API Reference](https://docs.kadoa.com/api)** - Detailed API documentation
- **[GitHub Examples](https://github.com/kadoa-org/kadoa-sdks/tree/main/examples/python-examples)** - Working code examples

## Requirements

- Python 3.11 or higher
- Dependencies are automatically installed

## Support

- **Documentation:** [docs.kadoa.com](https://docs.kadoa.com)
- **Support:** [support@kadoa.com](mailto:support@kadoa.com)
- **Issues:** [GitHub Issues](https://github.com/kadoa-org/kadoa-sdks/issues)

## License

MIT
