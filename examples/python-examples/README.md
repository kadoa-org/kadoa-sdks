# Kadoa Python SDK Examples

This package contains examples for using the Kadoa Python SDK.

## Structure

All example scripts are located in the `src/` directory:

- `run_extraction.py` - Basic extraction with pagination
- `extraction-builder-demo.py` - Demonstrates different extraction builder patterns
- `run-extraction-with-notifications.py` - Extraction with notifications and realtime events
- `run-extraction-with-validation.py` - Extraction with validation rules and anomaly detection
- `create-workflow-and-run-in-parallel.py` - Create workflow and run multiple extractions in parallel

## Setup

1. Install dependencies:
```bash
uv sync
```

2. Create a `.env` file in the `examples/python-examples/` directory with your API credentials:
```env
KADOA_API_KEY=your_api_key
KADOA_PUBLIC_API_URI=your_api_url
```

The SDK automatically loads configuration from:
- Environment variables (highest priority)
- `.env` file (fallback)
- Default values

## Running Examples

Run any example from the `examples/python-examples/` directory using `uv`:

```bash
# Basic extraction
uv run python src/run_extraction.py

# Extraction builder demo
uv run python src/extraction-builder-demo.py

# With notifications
uv run python src/run-extraction-with-notifications.py

# With validation
uv run python src/run-extraction-with-validation.py

# Parallel execution
uv run python src/create-workflow-and-run-in-parallel.py
```

## Configuration

The examples use the SDK's built-in configuration management via `get_settings()` which automatically:
- Loads environment variables
- Falls back to `.env` files
- Uses sensible defaults

No manual `load_dotenv()` calls or environment variable checks are needed - the SDK handles everything automatically.

