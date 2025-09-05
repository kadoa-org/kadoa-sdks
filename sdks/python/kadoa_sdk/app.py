"""
Kadoa SDK application initialization and configuration.
"""

from dataclasses import dataclass
from typing import Optional, Callable, Dict, Any
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from kadoa_sdk.events import KadoaEventEmitter, AnyKadoaEvent
from openapi_client import Configuration


@dataclass
class KadoaSdk:
    """Container for Kadoa SDK instance."""

    configuration: Configuration
    session: requests.Session
    base_url: str
    events: KadoaEventEmitter

    def __hash__(self):
        """Make the app hashable using its object ID."""
        return hash(id(self))

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
        return self.events.emit(event_name, payload, source, metadata)

    def on_event(self, listener: Callable[[AnyKadoaEvent], None]) -> None:
        """
        Subscribe to SDK events.

        Args:
            listener: Callback function that receives KadoaEvent instances
        """
        self.events.on_event(listener)

    def off_event(self, listener: Callable[[AnyKadoaEvent], None]) -> None:
        """
        Unsubscribe from SDK events.

        Args:
            listener: Callback function to remove
        """
        self.events.off_event(listener)


@dataclass
class KadoaSdkConfig:
    """Configuration options for Kadoa SDK."""

    api_key: str
    base_url: str = "https://api.kadoa.com"
    timeout: int = 30


def initialize_app(config: KadoaSdkConfig) -> KadoaSdk:
    """
    Initialize a Kadoa app instance.

    Args:
        config: Configuration options for the Kadoa SDK

    Returns:
        Initialized KadoaApp instance

    Example:
        >>> from kadoa_sdk import initialize_app
        >>>
        >>> app = initialize_app(KadoaSdkConfig(
        ...     api_key='your-api-key'
        ... ))
    """
    # Create API configuration
    configuration = Configuration(host=config.base_url, api_key={"ApiKeyAuth": config.api_key})

    # Create session with retry strategy
    session = requests.Session()

    # Configure retries
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)

    # Set timeout
    session.request = _wrap_request_with_timeout(session.request, config.timeout)

    # Create event emitter
    events = KadoaEventEmitter()

    return KadoaSdk(
        configuration=configuration, session=session, base_url=config.base_url, events=events
    )


def _wrap_request_with_timeout(original_request, timeout):
    """Wrap request method to add default timeout."""

    def request_with_timeout(*args, **kwargs):
        if "timeout" not in kwargs:
            kwargs["timeout"] = timeout
        return original_request(*args, **kwargs)

    return request_with_timeout


def get_config(app: KadoaSdk) -> Configuration:
    """
    Get the configuration from an app instance.

    Args:
        app: The KadoaSdk instance

    Returns:
        The Configuration object
    """
    return app.configuration


def get_http_client(app: KadoaSdk) -> requests.Session:
    """
    Get the requests session from an app instance.

    Args:
        app: The KadoaSdk instance

    Returns:
        The requests Session
    """
    return app.session


def dispose(app: KadoaSdk) -> None:
    """
    Dispose of a KadoaSdk instance and clean up resources.

    Args:
        app: The KadoaSdk instance to dispose

    Example:
        >>> app = initialize_app(KadoaSdkConfig(api_key='key'))
        >>> # ... use the app
        >>> dispose(app)  # Clean up when done
    """
    if app and hasattr(app, "events"):
        app.events.remove_all_event_listeners()

    # Session cleanup happens automatically via garbage collection
    # but we can close it explicitly if needed
    if app and hasattr(app, "session"):
        try:
            app.session.close()
        except Exception:
            pass  # Ignore errors during cleanup
