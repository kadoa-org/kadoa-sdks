# Python SDK Testing Style Guide

## Test Organization

```
tests/
├── unit/           # Unit tests for individual components
├── integration/    # Integration tests for component interactions
├── e2e/           # End-to-end tests against real/mock services
└── fixtures/      # Shared test fixtures and data
```

## Naming Conventions

### Files
- Use `test_*.py` prefix for all test files
- Name after the feature being tested: `test_extraction.py`, `test_auth.py`
- Avoid redundant words: ❌ `test_extraction_module.py` ✅ `test_extraction.py`

### Classes
- Use `Test` prefix: `TestExtraction`, `TestAuthentication`
- No redundant suffixes: ❌ `TestExtractionE2E` ✅ `TestExtraction`
- Group related tests in a single class

### Methods
- Start with `test_`
- Be descriptive but concise
- Use snake_case

**Good examples:**
```python
def test_extraction_with_valid_url()
def test_extraction_handles_timeout()
def test_extraction_with_multiple_urls()
```

**Avoid:**
```python
def test_should_extract_data_when_valid_url_is_provided()  # Too verbose
def test_extract()  # Too vague
```

## Test Structure

### Basic Pattern
```python
# Arrange
<setup test data>

# Act
<execute the function>

# Assert
<verify results>
```

### Assertions
Keep assertions simple and readable:
```python
# Good
assert result is not None
assert result.status == "success"
assert len(result.data) > 0

# Avoid
assert result is not None, "Result should not be None"  # Redundant message
```

### Fixtures
Use pytest fixtures for reusable setup:
```python
@pytest.fixture
def sdk():
    """Initialize SDK for tests."""
    return initialize_sdk(KadoaSdkConfig(api_key="test"))

def test_extraction(sdk):
    """Test using the sdk fixture."""
    result = run_extraction(sdk, options)
```

## Markers

Use pytest markers to categorize tests:
```python
@pytest.mark.unit          # Fast, isolated unit tests
@pytest.mark.integration   # Tests with dependencies
@pytest.mark.e2e          # End-to-end tests
@pytest.mark.slow         # Tests that take > 5 seconds
@pytest.mark.timeout(30)  # Set specific timeout
```

## Docstrings

Keep docstrings concise:
```python
def test_extraction_with_valid_url():
    """Test extraction runs successfully with valid URL."""
    # NOT: "This test verifies that the extraction function..."
```

## Test Data

### Constants
Define test constants at module level:
```python
TEST_API_KEY = "test-key-123"
TEST_URL = "https://example.com"
TIMEOUT_SECONDS = 30
```

### Environment Variables
Use defaults for local development:
```python
api_key = os.environ.get("KADOA_API_KEY", "default-test-key")
base_url = os.environ.get("KADOA_PUBLIC_API_URI", "http://localhost:12380")
```

## Running Tests

```bash
# All tests
make test

# Specific category
pytest tests/unit -v
pytest tests/e2e -m e2e

# With coverage
make test-coverage

# Single file
pytest tests/e2e/test_extraction.py
```

## Example Test File

```python
"""Tests for extraction functionality."""

import pytest
from kadoa_sdk import initialize_sdk, run_extraction

# Test constants
TEST_URL = "https://sandbox.kadoa.com/careers"
TIMEOUT_SECONDS = 30


class TestExtraction:
    """Tests for extraction features."""
    
    @pytest.fixture
    def sdk(self):
        """Initialize SDK for tests."""
        return initialize_sdk(test_config())
    
    @pytest.mark.e2e
    @pytest.mark.timeout(60)
    def test_extraction_with_valid_url(self, sdk):
        """Test extraction runs successfully with valid URL."""
        result = run_extraction(sdk, {"urls": [TEST_URL]})
        
        assert result is not None
        assert result.workflow_id
        assert result.status == "success"
    
    @pytest.mark.unit
    def test_extraction_validates_urls(self):
        """Test URL validation in extraction options."""
        with pytest.raises(ValueError):
            run_extraction(sdk, {"urls": []})
```

## Anti-patterns to Avoid

❌ **Don't** use nested test classes unless absolutely necessary
❌ **Don't** write overly verbose test names
❌ **Don't** add redundant assertion messages
❌ **Don't** mix test categories in the same file
❌ **Don't** hardcode credentials or secrets
❌ **Don't** write tests that depend on execution order