#!/usr/bin/env python3
"""
Run extraction example for Kadoa SDK.
"""

import os
import sys
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.DEBUG)

# Add the SDK to path for local development
sdk_path = Path(__file__).parent.parent.parent / "sdks" / "python"
if sdk_path.exists():
    sys.path.insert(0, str(sdk_path))

from kadoa_sdk import KadoaClient, KadoaClientConfig, ExtractionOptions
from dotenv import load_dotenv


def main():
    # Load environment variables
    load_dotenv(Path(__file__).parent / ".env")
    
    # Check required environment variables
    api_key = os.environ.get("KADOA_API_KEY")
    api_url = os.environ.get("KADOA_PUBLIC_API_URI")
    
    assert api_key, "KADOA_API_KEY is not set"
    assert api_url, "KADOA_PUBLIC_API_URI is not set"
    
    # Initialize the client
    client = KadoaClient(KadoaClientConfig(
        api_key=api_key,
        base_url=api_url
    ))
    client.on_event(lambda event: print(event))
    
    # Run extraction
    result = client.extraction.run(ExtractionOptions(
        urls=["https://sandbox.kadoa.com/ecommerce"]
    ))
    
    print(result)


if __name__ == "__main__":
    try:
        main()
    except AssertionError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)