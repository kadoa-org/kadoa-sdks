"""Version check utility for checking if a newer SDK version is available"""

import asyncio
import logging

from ..version import SDK_NAME, __version__

logger = logging.getLogger("kadoa.client")

PYPI_API_URL = "https://pypi.org/pypi/kadoa_sdk/json"
PACKAGE_NAME = "kadoa_sdk"


def _compare_versions(version1: str, version2: str) -> bool:
    """Compare two semantic version strings.
    
    Args:
        version1: First version string
        version2: Second version string
        
    Returns:
        True if version1 is newer than version2, False otherwise
    """
    v1_parts = [int(x) for x in version1.split(".")]
    v2_parts = [int(x) for x in version2.split(".")]
    
    max_len = max(len(v1_parts), len(v2_parts))
    v1_parts.extend([0] * (max_len - len(v1_parts)))
    v2_parts.extend([0] * (max_len - len(v2_parts)))
    
    for v1_part, v2_part in zip(v1_parts, v2_parts):
        if v1_part > v2_part:
            return True
        if v1_part < v2_part:
            return False
    
    return False


async def _check_for_updates_async() -> None:
    """Check if a newer version of the SDK is available on PyPI.
    
    This is an async function that runs in the background.
    """
    try:
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                PYPI_API_URL,
                headers={"Accept": "application/json"},
            ) as response:
                if response.status != 200:
                    return
                
                data = await response.json()
                latest_version = data.get("info", {}).get("version")
                
                if not latest_version:
                    return
                
                if _compare_versions(latest_version, __version__):
                    logger.warning(
                        f"⚠️  A new version of {SDK_NAME} is available: {latest_version} "
                        f"(current: {__version__}). Update with: pip install --upgrade {PACKAGE_NAME}"
                    )
    except Exception:
        # Silently fail - version check should not break client initialization
        pass


def check_for_updates() -> None:
    """Check for updates in the background (non-blocking).
    
    This function schedules the version check to run asynchronously
    without blocking the client initialization.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If loop is already running, schedule as a task
            asyncio.create_task(_check_for_updates_async())
        else:
            # If no loop is running, run until complete
            loop.run_until_complete(_check_for_updates_async())
    except RuntimeError:
        # No event loop available, create a new one
        try:
            asyncio.run(_check_for_updates_async())
        except Exception:
            # Silently ignore all errors
            pass
    except Exception:
        # Silently ignore all errors - version check should not affect client initialization
        pass

