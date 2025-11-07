"""Core utility functions for polling and other operations."""

from __future__ import annotations

import time
from typing import Callable, Generic, Optional, TypeVar

from .exceptions import KadoaErrorCode, KadoaSdkError

T = TypeVar("T")


class PollingOptions:
    """Options for polling operations"""

    def __init__(
        self,
        poll_interval_ms: Optional[int] = None,
        timeout_ms: Optional[int] = None,
    ) -> None:
        """
        Args:
            poll_interval_ms: Polling interval in milliseconds (minimum 250ms). Default: 1000
            timeout_ms: Timeout in milliseconds. Default: 300000 (5 minutes)
        """
        self.poll_interval_ms = poll_interval_ms or 1000
        self.timeout_ms = timeout_ms or (5 * 60 * 1000)


class PollingResult(Generic[T]):
    """Result of a polling operation"""

    def __init__(self, result: T, attempts: int, duration: int) -> None:
        """
        Args:
            result: The final result when polling completes successfully
            attempts: The number of polling attempts made
            duration: The total time spent polling in milliseconds
        """
        self.result = result
        self.attempts = attempts
        self.duration = duration


def poll_until(
    poll_fn: Callable[[], T],
    is_complete: Callable[[T], bool],
    options: Optional[PollingOptions] = None,
) -> PollingResult[T]:
    """
    Synchronous polling utility that polls a function until a condition is met.

    Uses time.sleep() to wait between polling attempts.

    Args:
        poll_fn: Function to call on each poll attempt (must be synchronous)
        is_complete: Function to check if polling should complete
        options: Polling configuration options

    Returns:
        PollingResult with the final result, attempts count, and duration

    Raises:
        KadoaSdkError: If polling times out or is aborted

    Example:
        ```python
        result = poll_until(
            lambda: api.get_status(id),
            lambda status: status.completed_at is not None,
            PollingOptions(poll_interval_ms=2000, timeout_ms=60000)
        )
        ```
    """
    if options is None:
        options = PollingOptions()

    poll_interval_ms = max(250, options.poll_interval_ms)
    timeout_ms = options.timeout_ms
    start = time.time() * 1000  # Convert to milliseconds
    attempts = 0

    while (time.time() * 1000 - start) < timeout_ms:
        attempts += 1

        # Execute poll function
        current = poll_fn()

        if is_complete(current):
            duration = int(time.time() * 1000 - start)
            return PollingResult(result=current, attempts=attempts, duration=duration)

        time.sleep(poll_interval_ms / 1000.0)

    duration = int(time.time() * 1000 - start)
    raise KadoaSdkError(
        f"Polling operation timed out after {timeout_ms}ms",
        code=KadoaErrorCode.TIMEOUT,
        details={
            "timeout_ms": timeout_ms,
            "attempts": attempts,
            "duration": duration,
        },
    )
