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

## Create a Workflow from a Template

Instantiate a workflow from a published template with `template_id`. `urls` is required; `template_version` optionally selects a published version. `user_prompt` adds workflow-specific instructions to the template prompt. Do not supply `entity`, `fields`, `schema_id`, or `monitoring`, because the template controls them.

```python
from kadoa_sdk.workflows.workflows_core_service import CreateWorkflowInput

workflow = client.workflow.create(
    CreateWorkflowInput(
        urls=['https://example.com/products'],
        template_id='11111111-1111-4111-8111-111111111111',
        template_version=2,
        user_prompt='Only include products currently in stock.',
        name='In-stock products',
    )
)

print(workflow.id)
```

## Node.js-only APIs

Workflow Assistant, personal Inbox, and `listWorkflowRuns` are currently available only in the [Node.js SDK](https://www.npmjs.com/package/@kadoa/node-sdk). They are not exposed by this Python SDK. See [Create Workflows from Templates](https://docs.kadoa.com/docs/sdk/templates/overview) for template lifecycle semantics.

## Realtime WebSockets

```python
realtime = await client.connect_realtime()
realtime.on_event(lambda event: print("Event:", event))
realtime.on_connection(
    lambda connected, reason=None: print("Connection:", connected, reason)
)
```

The SDK reconnects automatically when the realtime service drains a socket during deploys. When the server includes `_cursor` on events, the client resumes with `lastCursor` on the replacement subscribe and suppresses overlap duplicates by `event["id"]`.

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
