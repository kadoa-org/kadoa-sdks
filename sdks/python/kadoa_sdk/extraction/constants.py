"""
Constants for extraction module.
"""

from typing import Dict, Any


DEFAULT_OPTIONS: Dict[str, Any] = {
    "polling_interval": 5000,  # milliseconds
    "max_wait_time": 300000,  # milliseconds (5 minutes)
    "navigation_mode": "single-page",
    "location": {"type": "auto"},
    "name": "Untitled Workflow",
    "data_limit": 100,
}

MAX_DATA_LIMIT = 99999

TERMINAL_RUN_STATES = frozenset(
    [
        "FINISHED",
        "SUCCESS",
        "FAILED",
        "ERROR",
        "STOPPED",
        "CANCELLED",
    ]
)

SUCCESSFUL_RUN_STATES = frozenset(["FINISHED", "SUCCESS"])

ENTITY_API_ENDPOINT = "/v4/entity"
DEFAULT_API_BASE_URL = "https://api.kadoa.com"

ERROR_MESSAGES = {
    "NO_URLS": "At least one URL is required for extraction",
    "NO_API_KEY": "API key is required for entity detection",
    "LINK_REQUIRED": "Link is required for entity field detection",
    "NO_WORKFLOW_ID": "Failed to start extraction process - no ID received",
    "NO_PREDICTIONS": "No entity predictions returned from the API",
    "PARSE_ERROR": "Failed to parse entity response",
    "NETWORK_ERROR": "Network error while fetching entity fields",
    "AUTH_FAILED": "Authentication failed. Please check your API key",
    "RATE_LIMITED": "Rate limit exceeded. Please try again later",
    "SERVER_ERROR": "Server error while fetching entity fields",
    "DATA_FETCH_FAILED": "Failed to retrieve extracted data from workflow",
    "PROGRESS_CHECK_FAILED": "Failed to check extraction progress",
    "EXTRACTION_FAILED": "Data extraction failed for the provided URLs",
}
