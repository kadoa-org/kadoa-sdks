# Release Notes - Kadoa Python SDK v0.1.0

## 🎉 Initial Release

We're excited to announce the first official release of the Kadoa Python SDK! This release brings feature parity with our Node.js SDK, providing a robust and type-safe Python client for the Kadoa API.

## 📦 Installation

```bash
pip install kadoa-sdk
```

## ✨ Key Features

### Dynamic Entity Detection
Automatically discover and extract structured data from websites without predefined schemas:

```python
from kadoa_sdk import initialize_app, KadoaSdkConfig, run_extraction, ExtractionOptions

app = initialize_app(KadoaSdkConfig(api_key="your-api-key"))

result = run_extraction(app, ExtractionOptions(
    urls=["https://example.com/products"],
    name="Product Catalog"
))

print(f"Extracted {len(result.data)} items")
```

### Event-Driven Architecture
Monitor extraction lifecycle with real-time events:

```python
def on_event(event):
    print(f"{event.type}: {event.payload}")

app.on_event(on_event)

# Events emitted:
# - entity:detected
# - extraction:started
# - extraction:status_changed
# - extraction:data_available
# - extraction:completed
```

### Robust Error Handling
Comprehensive exception handling with detailed context:

```python
from kadoa_sdk import KadoaHttpException

try:
    result = run_extraction(app, options)
except KadoaHttpException as e:
    print(f"HTTP {e.http_status}: {e.message}")
    print(f"Request ID: {e.request_id}")
```

## 🔧 Requirements

- Python 3.8 or higher
- Dependencies automatically installed:
  - requests (HTTP client)
  - pydantic (data validation)
  - urllib3 (connection pooling)
  - python-dateutil (date handling)

## 📚 Documentation

- [GitHub Repository](https://github.com/kadoa/kadoa-sdks)
- [API Documentation](https://docs.kadoa.com)
- [Examples](https://github.com/kadoa/kadoa-sdks/tree/main/examples/python-examples)

## 🧪 Testing

The SDK includes comprehensive test coverage:
- Unit tests for all core functionality
- E2E tests for extraction workflows
- Thread-safety tests for concurrent operations

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines in the repository.

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

This SDK achieves feature parity with our Node.js SDK, ensuring consistent behavior across both platforms.