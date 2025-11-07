"""Centralized logging module for Kadoa SDK

Provides namespaced loggers matching Node.js SDK patterns.
Supports DEBUG environment variable configuration like Node.js SDK:
    DEBUG=kadoa:*              # Enable all SDK logs
    DEBUG=kadoa:extraction     # Enable only extraction logs
    DEBUG=kadoa:client,kadoa:http  # Enable multiple modules
"""

import logging
import os
from typing import Set


def _parse_debug_env() -> Set[str]:
    """Parse DEBUG environment variable to determine enabled loggers.

    Supports patterns matching Node.js debug package:
    - kadoa:* matches all kadoa loggers
    - kadoa:extraction matches only extraction logger
    - kadoa:client,kadoa:http matches multiple specific loggers

    Returns:
        Set of enabled logger namespaces (empty set if none enabled)
    """
    debug_env = os.getenv("DEBUG", "").strip()
    if not debug_env:
        return set()

    enabled: Set[str] = set()
    patterns = [p.strip() for p in debug_env.split(",") if p.strip()]

    for pattern in patterns:
        if pattern == "kadoa:*":
            # Enable all kadoa loggers
            enabled.add("*")
        elif pattern.startswith("kadoa:"):
            # Specific namespace (e.g., kadoa:extraction -> extraction)
            namespace = pattern[6:]  # Remove "kadoa:" prefix
            enabled.add(namespace)
        elif pattern.startswith("*"):
            # Wildcard pattern (e.g., *:extraction)
            enabled.add("*")
        else:
            # Direct namespace match (e.g., extraction)
            enabled.add(pattern)

    return enabled


def _should_enable_logger(namespace: str, enabled_patterns: Set[str]) -> bool:
    """Check if a logger namespace should be enabled based on DEBUG env var.

    Args:
        namespace: Logger namespace to check
        enabled_patterns: Set of enabled patterns from DEBUG env var

    Returns:
        True if logger should be enabled, False otherwise
    """
    if not enabled_patterns:
        return False

    # Wildcard matches everything
    if "*" in enabled_patterns:
        return True

    # Direct namespace match
    return namespace in enabled_patterns


def _configure_logging_from_env() -> None:
    """Configure logging levels based on DEBUG environment variable.

    This function is called automatically when the module is imported.
    It sets DEBUG level for loggers matching the DEBUG env var pattern.
    """
    enabled_patterns = _parse_debug_env()
    if not enabled_patterns:
        return

    # Ensure root logger has a handler if DEBUG is enabled
    # This ensures debug messages are actually output
    if not logging.root.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(name)s %(levelname)s: %(message)s"))
        logging.root.addHandler(handler)
        logging.root.setLevel(logging.DEBUG)

    # Configure root kadoa logger
    root_logger = logging.getLogger("kadoa")
    root_logger.setLevel(logging.DEBUG)

    # Enable DEBUG for matching loggers
    if "*" in enabled_patterns:
        # Enable all kadoa loggers (already set above via root logger)
        pass
    else:
        # Enable specific loggers
        for namespace in enabled_patterns:
            logger = logging.getLogger(f"kadoa.{namespace}")
            logger.setLevel(logging.DEBUG)


def create_logger(namespace: str) -> logging.Logger:
    """Create a logger with the kadoa namespace prefix

    Args:
        namespace: Logger namespace (e.g., 'client', 'extraction', 'workflow')

    Returns:
        Logger instance with name 'kadoa.{namespace}'
    """
    logger = logging.getLogger(f"kadoa.{namespace}")

    # Configure based on DEBUG env var
    enabled_patterns = _parse_debug_env()
    if enabled_patterns and _should_enable_logger(namespace, enabled_patterns):
        logger.setLevel(logging.DEBUG)

    return logger


# Configure logging on module import
_configure_logging_from_env()

# Pre-configured loggers for each module
client = create_logger("client")
wss = create_logger("wss")
extraction = create_logger("extraction")
http = create_logger("http")
workflow = create_logger("workflow")
crawl = create_logger("crawl")
notifications = create_logger("notifications")
schemas = create_logger("schemas")
validation = create_logger("validation")

__all__ = [
    "create_logger",
    "client",
    "wss",
    "extraction",
    "http",
    "workflow",
    "crawl",
    "notifications",
    "schemas",
    "validation",
]
