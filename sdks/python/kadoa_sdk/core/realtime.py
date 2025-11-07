"""Realtime WebSocket connection for Kadoa SDK"""

from __future__ import annotations

import asyncio
import json
import time
from threading import Lock
from typing import Any, Callable, Optional

import aiohttp
import websockets
from pydantic import BaseModel
from websockets.client import ClientConnection

from kadoa_sdk.core.logger import wss as logger
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.version import __version__

SDK_VERSION = __version__


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
        self._last_heartbeat: float = time.time() * 1000  # milliseconds
        self._is_connecting: bool = False
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._reconnect_task: Optional[asyncio.Task] = None

        self._event_listeners: list[Callable[[Any], None]] = []
        self._connection_listeners: list[Callable[[bool, Optional[str]], None]] = []
        self._error_listeners: list[Callable[[Any], None]] = []
        self._listeners_lock = Lock()

        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._loop_thread: Optional[Any] = None

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
                    pass  # Fire and forget
        except Exception as e:
            logger.debug("Failed to acknowledge event: %s", e)

    def _handle_heartbeat(self) -> None:
        """Handle heartbeat message"""
        logger.debug("Heartbeat received")
        self._last_heartbeat = time.time() * 1000

    async def _start_heartbeat_check(self) -> None:
        """Start monitoring heartbeat messages"""
        while self._ws is not None:
            try:
                if hasattr(self._ws, "closed") and self._ws.closed:
                    break
                if hasattr(self._ws, "close_code") and self._ws.close_code is not None:
                    break
            except Exception:
                break

            await asyncio.sleep(self._heartbeat_interval / 1000.0)
            if time.time() * 1000 - self._last_heartbeat > self._missed_heartbeats_limit:
                logger.debug(
                    "No heartbeat received in %d seconds! Closing connection.",
                    self._missed_heartbeats_limit / 1000,
                )
                if self._ws:
                    await self._ws.close()
                break

    async def _handle_messages(self) -> None:
        """Handle incoming WebSocket messages"""
        if not self._ws:
            return

        try:
            async for message in self._ws:
                try:
                    data = json.loads(message)
                    if data.get("type") == "heartbeat":
                        self._handle_heartbeat()
                    else:
                        if data.get("id"):
                            asyncio.create_task(self._acknowledge_event(data["id"]))
                        self._notify_event_listeners(data)
                except json.JSONDecodeError as e:
                    logger.debug("Failed to parse incoming message: %s", e)
        except websockets.exceptions.ConnectionClosed:
            logger.debug("WebSocket connection closed")
            await self._handle_disconnect("Connection closed")
        except Exception as e:
            logger.debug("Error handling messages: %s", e)
            await self._handle_disconnect(str(e))

    async def _handle_disconnect(self, reason: str) -> None:
        """Handle WebSocket disconnection"""
        self._is_connecting = False
        self._is_connected_state = False
        self._connection_reason = reason
        self._stop_heartbeat_check()
        self._notify_connection_listeners(False, reason)
        if not self._reconnect_task or self._reconnect_task.done():
            self._reconnect_task = asyncio.create_task(self._reconnect())

    async def _reconnect(self) -> None:
        """Reconnect to WebSocket after delay"""
        await asyncio.sleep(self._reconnect_delay / 1000.0)
        needs_reconnect = not self._is_connecting
        if self._ws is not None:
            try:
                if hasattr(self._ws, "close_code") and self._ws.close_code is not None:
                    needs_reconnect = True
            except Exception:
                needs_reconnect = True
        else:
            needs_reconnect = True

        if needs_reconnect:
            logger.debug("Attempting to reconnect...")
            await self.connect()

    def _stop_heartbeat_check(self) -> None:
        """Stop heartbeat monitoring"""
        if self._heartbeat_task and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()

    def _notify_event_listeners(self, event: Any) -> None:
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

    async def connect(self) -> None:
        """Connect to WebSocket server"""
        if self._is_connecting:
            return
        self._is_connecting = True

        try:
            access_token, team_id = await self._get_oauth_token()

            settings = get_settings()
            uri = f"{settings.wss_api_uri}?access_token={access_token}"
            self._ws = await websockets.connect(uri)

            await self._ws.send(json.dumps({"action": "subscribe", "channel": team_id}))

            logger.debug("Connected to WebSocket")
            self._last_heartbeat = time.time() * 1000
            self._is_connecting = False

            self._heartbeat_task = asyncio.create_task(self._start_heartbeat_check())

            asyncio.create_task(self._handle_messages())

            self._is_connected_state = True
            self._connection_reason = None
            self._notify_connection_listeners(True)

            # Also emit SDK event for connection
            try:
                pass
                # This would require access to event emitter, but for now just notify listeners
            except Exception:
                pass

        except Exception as e:
            logger.debug("Failed to connect: %s", e)
            self._is_connecting = False
            self._is_connected_state = False
            self._notify_error_listeners(e)
            if not self._reconnect_task or self._reconnect_task.done():
                self._reconnect_task = asyncio.create_task(self._reconnect())

    def on_event(self, listener: Callable[[Any], None]) -> Callable[[], None]:
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
        self._stop_heartbeat_check()
        if self._ws:
            await self._ws.close()
            self._ws = None
        # Clear all listeners
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
            # websockets.ClientConnection uses close_code attribute
            # None means still open, non-None means closed
            return self._ws.close_code is None
        except (AttributeError, Exception):
            return False
