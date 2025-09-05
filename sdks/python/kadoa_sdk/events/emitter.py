"""
Event emitter implementation for Kadoa SDK.
"""

import logging
import threading
from collections import defaultdict
from typing import Any, Callable, Dict, List, Optional

from kadoa_sdk.events.event_types import AnyKadoaEvent, KadoaEvent

logger = logging.getLogger(__name__)


class EventEmitter:
    """
    Thread-safe event emitter base class.

    Supports multiple listeners per event with proper memory management.
    """

    def __init__(self):
        """Initialize the event emitter."""
        self._listeners: Dict[str, List[Callable]] = defaultdict(list)
        self._once_listeners: Dict[str, List[Callable]] = defaultdict(list)
        self._lock = threading.RLock()

    def on(self, event_name: str, listener: Callable) -> "EventEmitter":
        """
        Subscribe to an event.

        Args:
            event_name: Name of the event to subscribe to
            listener: Callback function to invoke when event is emitted

        Returns:
            Self for method chaining
        """
        with self._lock:
            if listener not in self._listeners[event_name]:
                self._listeners[event_name].append(listener)
        return self

    def once(self, event_name: str, listener: Callable) -> "EventEmitter":
        """
        Subscribe to an event (one-time only).

        Args:
            event_name: Name of the event to subscribe to
            listener: Callback function to invoke once when event is emitted

        Returns:
            Self for method chaining
        """
        with self._lock:
            if listener not in self._once_listeners[event_name]:
                self._once_listeners[event_name].append(listener)
        return self

    def off(self, event_name: str, listener: Callable) -> "EventEmitter":
        """
        Unsubscribe from an event.

        Args:
            event_name: Name of the event to unsubscribe from
            listener: Callback function to remove

        Returns:
            Self for method chaining
        """
        with self._lock:
            # Remove from regular listeners
            if event_name in self._listeners:
                try:
                    self._listeners[event_name].remove(listener)
                    if not self._listeners[event_name]:
                        del self._listeners[event_name]
                except ValueError:
                    pass  # Listener not in list

            # Remove from once listeners
            if event_name in self._once_listeners:
                try:
                    self._once_listeners[event_name].remove(listener)
                    if not self._once_listeners[event_name]:
                        del self._once_listeners[event_name]
                except ValueError:
                    pass  # Listener not in list

        return self

    def emit(self, event_name: str, *args, **kwargs) -> bool:
        """
        Emit an event to all listeners.

        Args:
            event_name: Name of the event to emit
            *args: Positional arguments to pass to listeners
            **kwargs: Keyword arguments to pass to listeners

        Returns:
            True if there were listeners, False otherwise
        """
        with self._lock:
            # Gather all listeners
            listeners = list(self._listeners.get(event_name, []))
            once_listeners = list(self._once_listeners.get(event_name, []))

            # Clear once listeners
            if event_name in self._once_listeners:
                del self._once_listeners[event_name]

        # Call listeners outside of lock to prevent deadlocks
        had_listeners = len(listeners) + len(once_listeners) > 0

        # Call regular listeners
        for listener in listeners:
            try:
                listener(*args, **kwargs)
            except Exception as e:
                logger.error(f"Error in event listener for '{event_name}': {e}")

        # Call once listeners
        for listener in once_listeners:
            try:
                listener(*args, **kwargs)
            except Exception as e:
                logger.error(f"Error in once listener for '{event_name}': {e}")

        return had_listeners

    def remove_all_listeners(self, event_name: Optional[str] = None) -> "EventEmitter":
        """
        Remove all listeners for an event or all events.

        Args:
            event_name: Optional event name. If None, removes all listeners.

        Returns:
            Self for method chaining
        """
        with self._lock:
            if event_name is None:
                self._listeners.clear()
                self._once_listeners.clear()
            else:
                if event_name in self._listeners:
                    del self._listeners[event_name]
                if event_name in self._once_listeners:
                    del self._once_listeners[event_name]

        return self

    def listener_count(self, event_name: str) -> int:
        """
        Get the number of listeners for an event.

        Args:
            event_name: Name of the event

        Returns:
            Number of active listeners
        """
        with self._lock:
            count = len(self._listeners.get(event_name, []))
            count += len(self._once_listeners.get(event_name, []))
            return count


class KadoaEventEmitter(EventEmitter):
    """
    Simplified type-safe event emitter for Kadoa SDK events.

    All events are emitted on a single "event" channel with structured
    payloads matching the Node.js implementation.
    """

    def emit(
        self,
        event_name: str,
        payload: Dict[str, Any],
        source: str = "sdk",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Emit a typed SDK event.

        Args:
            event_name: Name of the event (e.g., "entity:detected")
            payload: Event-specific payload data
            source: Source module/component (default: "sdk")
            metadata: Optional metadata for debugging

        Returns:
            True if there were listeners, False otherwise
        """
        event = KadoaEvent.create(
            event_type=event_name, payload=payload, source=source, metadata=metadata
        )

        # Single emission to "event" channel
        return super().emit("event", event)

    def on_event(self, listener: Callable[[AnyKadoaEvent], None]) -> "KadoaEventEmitter":
        """
        Subscribe to SDK events.

        Args:
            listener: Callback function that receives KadoaEvent instances

        Returns:
            Self for method chaining
        """
        return self.on("event", listener)

    def once_event(self, listener: Callable[[AnyKadoaEvent], None]) -> "KadoaEventEmitter":
        """
        Subscribe to SDK events (once).

        Args:
            listener: Callback function that receives KadoaEvent instances (called once)

        Returns:
            Self for method chaining
        """
        return self.once("event", listener)

    def off_event(self, listener: Callable[[AnyKadoaEvent], None]) -> "KadoaEventEmitter":
        """
        Unsubscribe from SDK events.

        Args:
            listener: Callback function to remove

        Returns:
            Self for method chaining
        """
        return self.off("event", listener)

    def remove_all_event_listeners(self) -> "KadoaEventEmitter":
        """
        Remove all event listeners.

        Returns:
            Self for method chaining
        """
        return self.remove_all_listeners("event")
