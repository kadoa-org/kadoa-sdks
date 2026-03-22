"""Realtime WebSocket connection for Kadoa SDK"""

from __future__ import annotations

import asyncio
import json
import time
from threading import Lock
from typing import Any, Callable, Literal, NotRequired, Optional, TypedDict

import aiohttp
import websockets
from pydantic import BaseModel
from websockets.asyncio.client import ClientConnection

from kadoa_sdk.core.logger import wss as logger
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.version import __version__

SDK_VERSION = __version__

SocketRole = Literal["active", "replacement"]


class RealtimeEvent(TypedDict):
    """Realtime event received from WebSocket"""

    type: str
    message: Any
    id: NotRequired[str]
    timestamp: int
    _cursor: NotRequired[str]


class DrainControlMessage(TypedDict):
    """Server signal that the current socket should be replaced."""

    type: Literal["control.draining"]
    retryAfterMs: NotRequired[int]


class RealtimeConfig(BaseModel):
    """Configuration for Realtime WebSocket connection"""

    api_key: str
    heartbeat_interval: int = 10000  # milliseconds
    reconnect_delay: int = 5000  # milliseconds
    missed_heartbeats_limit: int = 30000  # milliseconds


class Realtime:
    """WebSocket connection for real-time events"""

    def __init__(self, config: RealtimeConfig) -> None:
        self._api_key = config.api_key
        self._heartbeat_interval = config.heartbeat_interval
        self._reconnect_delay = config.reconnect_delay
        self._missed_heartbeats_limit = config.missed_heartbeats_limit

        self._ws: Optional[ClientConnection] = None
        self._draining_sockets: set[ClientConnection] = set()
        self._last_heartbeat: float = time.time() * 1000  # milliseconds
        self._is_connecting: bool = False
        self._heartbeat_task: Optional[asyncio.Task[None]] = None
        self._reconnect_task: Optional[asyncio.Task[None]] = None
        self._message_tasks: set[asyncio.Task[None]] = set()
        self._is_closed: bool = False
        self._has_connected_once: bool = False
        self._last_cursor: Optional[str] = None
        self._recent_event_ids: set[str] = set()
        self._recent_event_id_queue: list[str] = []
        self._max_recent_event_ids = 1000

        self._event_listeners: list[Callable[[RealtimeEvent], None]] = []
        self._connection_listeners: list[Callable[[bool, Optional[str]], None]] = []
        self._error_listeners: list[Callable[[Any], None]] = []
        self._listeners_lock = Lock()

        # Track connection state for late-registering listeners
        self._is_connected_state: bool = False
        self._connection_reason: Optional[str] = None

    def _get_or_create_loop(self) -> asyncio.AbstractEventLoop:
        """Get or create event loop for async operations"""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                raise RuntimeError("Event loop is closed")
            return loop
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return loop

    async def _get_oauth_token(self) -> tuple[str, str]:
        """Get OAuth token and team ID from API"""
        settings = get_settings()
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{settings.public_api_uri}/v4/oauth2/token",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": self._api_key,
                    "x-sdk-version": SDK_VERSION,
                },
            ) as response:
                if response.status != 200:
                    raise Exception(f"Failed to get OAuth token: {response.status}")
                data = await response.json()
                return data["access_token"], data["team_id"]

    async def _acknowledge_event(self, event_id: str) -> None:
        """Acknowledge event to server"""
        settings = get_settings()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{settings.realtime_api_uri}/api/v1/events/ack",
                    headers={"Content-Type": "application/json"},
                    json={"id": event_id},
                ):
                    pass
        except Exception as e:
            logger.debug("Failed to acknowledge event: %s", e)

    def _handle_heartbeat(self) -> None:
        """Handle heartbeat message"""
        logger.debug("Heartbeat received")
        self._last_heartbeat = time.time() * 1000

    async def _start_heartbeat_check(self) -> None:
        """Start monitoring heartbeat messages"""
        while self._ws is not None and not self._is_closed:
            await asyncio.sleep(self._heartbeat_interval / 1000.0)
            if self._ws is None or self._is_closed:
                break

            try:
                if self._ws.close_code is not None:
                    break
            except Exception:
                break

            if time.time() * 1000 - self._last_heartbeat > self._missed_heartbeats_limit:
                logger.debug(
                    "No heartbeat received in %d seconds! Closing connection.",
                    self._missed_heartbeats_limit / 1000,
                )
                await self._ws.close()
                break

    async def _handle_messages(self, ws: ClientConnection) -> None:
        """Handle incoming WebSocket messages for a specific socket."""
        try:
            while True:
                message = await ws.recv()
                if isinstance(message, bytes):
                    message = message.decode("utf-8", errors="replace")

                try:
                    data = json.loads(message)
                except json.JSONDecodeError as e:
                    logger.debug("Failed to parse incoming message: %s", e)
                    continue

                if data.get("type") == "heartbeat":
                    if ws is self._ws:
                        self._handle_heartbeat()
                    continue

                if data.get("type") == "control.draining":
                    await self._handle_drain_signal(ws, data)
                    continue

                cursor = data.get("_cursor")
                if isinstance(cursor, str):
                    self._last_cursor = cursor

                event_id = data.get("id")
                if isinstance(event_id, str):
                    asyncio.create_task(self._acknowledge_event(event_id))
                    if self._is_duplicate_event(event_id):
                        continue

                self._notify_event_listeners(data)
        except websockets.exceptions.ConnectionClosed:
            logger.debug("WebSocket connection closed")
            await self._handle_socket_closed(ws, "Connection closed")
        except Exception as e:
            logger.debug("Error handling messages: %s", e)
            await self._handle_socket_closed(ws, str(e))

    async def _handle_drain_signal(
        self, ws: ClientConnection, message: DrainControlMessage
    ) -> None:
        """Handle server drain signal for the active socket."""
        if ws is not self._ws or self._is_closed:
            return

        logger.debug("Received drain signal, preparing replacement socket")
        self._draining_sockets.add(ws)
        await self._schedule_reconnect(message.get("retryAfterMs", self._reconnect_delay), True)

    async def _handle_socket_closed(self, ws: ClientConnection, reason: str) -> None:
        """Handle an individual socket closing."""
        self._draining_sockets.discard(ws)

        if ws is not self._ws:
            return

        self._ws = None
        self._stop_heartbeat_check()

        if self._is_closed:
            return

        if self._draining_sockets:
            logger.debug("Draining socket closed after replacement was scheduled")
            return

        await self._handle_disconnect(reason)

    async def _handle_disconnect(self, reason: str) -> None:
        """Handle WebSocket disconnection"""
        self._is_connecting = False
        self._is_connected_state = False
        self._connection_reason = reason
        self._stop_heartbeat_check()
        self._notify_connection_listeners(False, reason)
        await self._schedule_reconnect(self._reconnect_delay, False)

    async def _schedule_reconnect(self, delay_ms: int, replacement: bool) -> None:
        """Schedule a reconnect attempt."""
        if self._is_closed:
            return

        if self._reconnect_task and not self._reconnect_task.done():
            return

        async def reconnect_after_delay() -> None:
            await asyncio.sleep(delay_ms / 1000.0)
            if self._is_closed or self._is_connecting:
                return
            if not replacement and self._ws is not None:
                return

            self._is_connecting = True
            try:
                await self._connect_socket("replacement" if replacement else "active")
            except Exception as e:
                logger.debug("Reconnect failed: %s", e)
                self._is_connecting = False
                self._notify_error_listeners(e)
                self._reconnect_task = None
                await self._schedule_reconnect(self._reconnect_delay, replacement)
            else:
                self._reconnect_task = None

        self._reconnect_task = asyncio.create_task(reconnect_after_delay())

    def _stop_heartbeat_check(self) -> None:
        """Stop heartbeat monitoring"""
        if self._heartbeat_task and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()
        self._heartbeat_task = None

    def _notify_event_listeners(self, event: RealtimeEvent) -> None:
        """Notify all event listeners"""
        with self._listeners_lock:
            listeners = list(self._event_listeners)
        for listener in listeners:
            try:
                listener(event)
            except Exception as e:
                logger.debug("Error in event listener: %s", e)

    def _notify_connection_listeners(self, connected: bool, reason: Optional[str] = None) -> None:
        """Notify all connection listeners"""
        with self._listeners_lock:
            listeners = list(self._connection_listeners)
        for listener in listeners:
            try:
                listener(connected, reason)
            except Exception as e:
                logger.debug("Error in connection listener: %s", e)

    def _notify_error_listeners(self, error: Any) -> None:
        """Notify all error listeners"""
        with self._listeners_lock:
            listeners = list(self._error_listeners)
        for listener in listeners:
            try:
                listener(error)
            except Exception as e:
                logger.debug("Error in error listener: %s", e)

    def _track_message_task(self, task: asyncio.Task[None]) -> None:
        """Keep message tasks reachable for cleanup."""
        self._message_tasks.add(task)
        task.add_done_callback(self._message_tasks.discard)

    def _promote_socket(self, ws: ClientConnection, role: SocketRole) -> None:
        """Make a socket the active connection."""
        if role == "replacement" and self._ws is not None and self._ws is not ws:
            self._draining_sockets.add(self._ws)

        self._ws = ws
        self._draining_sockets.discard(ws)
        self._last_heartbeat = time.time() * 1000
        self._is_connecting = False
        self._is_connected_state = True
        self._connection_reason = None

        self._heartbeat_task = asyncio.create_task(self._start_heartbeat_check())
        self._track_message_task(asyncio.create_task(self._handle_messages(ws)))
        if role == "active" or not self._has_connected_once:
            self._notify_connection_listeners(True)

    async def _connect_socket(self, role: SocketRole) -> None:
        """Open a websocket and subscribe, optionally resuming from the last cursor."""
        access_token, team_id = await self._get_oauth_token()

        settings = get_settings()
        uri = f"{settings.wss_api_uri}?access_token={access_token}"
        ws = await websockets.connect(uri)

        subscribe_msg: dict[str, Any] = {"action": "subscribe", "channel": team_id}
        if self._last_cursor:
            subscribe_msg["lastCursor"] = self._last_cursor

        await ws.send(json.dumps(subscribe_msg))
        logger.debug("Connected to WebSocket")
        self._promote_socket(ws, role)

    def _is_duplicate_event(self, event_id: str) -> bool:
        """Return True if the event id was recently seen."""
        if event_id in self._recent_event_ids:
            return True

        self._recent_event_ids.add(event_id)
        self._recent_event_id_queue.append(event_id)
        if len(self._recent_event_id_queue) > self._max_recent_event_ids:
            expired_id = self._recent_event_id_queue.pop(0)
            self._recent_event_ids.discard(expired_id)

        return False

    async def connect(self) -> None:
        """Connect to WebSocket server.

        Raises:
            Exception: If initial connection fails (OAuth token or WebSocket connection)
        """
        if self._is_closed or self._is_connecting or self._ws is not None:
            return

        self._is_connecting = True

        try:
            await self._connect_socket("active")
            self._has_connected_once = True
        except Exception as e:
            logger.debug("Failed to connect: %s", e)
            self._is_connecting = False
            self._is_connected_state = False
            self._notify_error_listeners(e)
            if not self._has_connected_once:
                raise
            await self._schedule_reconnect(self._reconnect_delay, False)

    def on_event(self, listener: Callable[[RealtimeEvent], None]) -> Callable[[], None]:
        """Subscribe to realtime events

        Args:
            listener: Function to handle incoming events

        Returns:
            Unsubscribe function
        """
        with self._listeners_lock:
            self._event_listeners.append(listener)

        def unsubscribe() -> None:
            with self._listeners_lock:
                if listener in self._event_listeners:
                    self._event_listeners.remove(listener)

        return unsubscribe

    def on_connection(self, listener: Callable[[bool, Optional[str]], None]) -> Callable[[], None]:
        """Subscribe to connection state changes

        Args:
            listener: Function to handle connection state changes

        Returns:
            Unsubscribe function
        """
        with self._listeners_lock:
            self._connection_listeners.append(listener)
            if self._is_connected_state:
                try:
                    listener(True, self._connection_reason)
                except Exception as e:
                    logger.debug("Error notifying late-registering connection listener: %s", e)

        def unsubscribe() -> None:
            with self._listeners_lock:
                if listener in self._connection_listeners:
                    self._connection_listeners.remove(listener)

        return unsubscribe

    def on_error(self, listener: Callable[[Any], None]) -> Callable[[], None]:
        """Subscribe to errors

        Args:
            listener: Function to handle errors

        Returns:
            Unsubscribe function
        """
        with self._listeners_lock:
            self._error_listeners.append(listener)

        def unsubscribe() -> None:
            with self._listeners_lock:
                if listener in self._error_listeners:
                    self._error_listeners.remove(listener)

        return unsubscribe

    async def close_async(self) -> None:
        """Close WebSocket connection (async)"""
        self._is_closed = True
        self._stop_heartbeat_check()

        if self._reconnect_task and not self._reconnect_task.done():
            self._reconnect_task.cancel()
        self._reconnect_task = None

        sockets_to_close: list[ClientConnection] = []
        if self._ws is not None:
            sockets_to_close.append(self._ws)
        sockets_to_close.extend(self._draining_sockets)

        self._ws = None
        self._draining_sockets.clear()
        for ws in sockets_to_close:
            try:
                await ws.close()
            except Exception:
                continue

        for task in list(self._message_tasks):
            task.cancel()
        self._message_tasks.clear()

        with self._listeners_lock:
            self._event_listeners.clear()
            self._connection_listeners.clear()
            self._error_listeners.clear()

    def close(self) -> None:
        """Close WebSocket connection"""
        loop = self._get_or_create_loop()
        if loop.is_running():
            asyncio.create_task(self.close_async())
        else:
            loop.run_until_complete(self.close_async())

    def is_connected(self) -> bool:
        """Check if WebSocket is connected"""
        if self._ws is None:
            return False
        try:
            return self._ws.close_code is None
        except (AttributeError, Exception):
            return False
