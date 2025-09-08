from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Optional

from openapi_client import ApiClient, Configuration

from .core.events import (
    AnyKadoaEvent,
    EventPayloadMap,
    KadoaEventEmitter,
    KadoaEventName,
)
from .extraction import ExtractionModule
from .version import __version__, SDK_NAME, SDK_LANGUAGE


@dataclass
class KadoaClientConfig:
    api_key: str
    base_url: Optional[str] = None
    timeout: Optional[int] = None


class KadoaClient:
    def __init__(self, config: KadoaClientConfig) -> None:
        self._base_url = config.base_url or "https://api.kadoa.com"
        self._timeout = config.timeout or 30

        configuration = Configuration()
        configuration.host = self._base_url
        configuration.api_key = {"ApiKeyAuth": config.api_key}

        self._configuration = configuration
        self._api_client = ApiClient(self._configuration)

        # Set SDK identification headers
        self._api_client.default_headers["User-Agent"] = f"{SDK_NAME}/{__version__}"
        self._api_client.default_headers["X-SDK-Version"] = __version__
        self._api_client.default_headers["X-SDK-Language"] = SDK_LANGUAGE

        self._events = KadoaEventEmitter()

        self.extraction = ExtractionModule(self)

    def on_event(self, listener: Callable[[AnyKadoaEvent], None]) -> None:
        self._events.on_event(listener)

    def off_event(self, listener: Callable[[AnyKadoaEvent], None]) -> None:
        self._events.off_event(listener)

    def emit(
        self,
        event_name: KadoaEventName,
        payload: EventPayloadMap,
        source: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> None:
        self._events.emit(event_name, payload, source or "sdk", metadata)

    @property
    def configuration(self) -> Configuration:
        return self._configuration

    @property
    def base_url(self) -> str:
        return self._base_url

    @property
    def timeout(self) -> int:
        return self._timeout

    @property
    def events(self) -> KadoaEventEmitter:
        return self._events

    def dispose(self) -> None:
        self._events.remove_all_event_listeners()
