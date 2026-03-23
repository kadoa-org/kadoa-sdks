import {
  PUBLIC_API_URI,
  REALTIME_API_URI,
  WSS_API_URI,
} from "../../runtime/config";
import { logger } from "../../runtime/logger";
import { SDK_VERSION } from "../../version";

const debug = logger.wss;

// if WebSocket doesn't exist in the global scope, import it
if (typeof WebSocket === "undefined") {
  global.WebSocket = require("ws");
}

interface DrainControlMessage {
  type: "control.draining";
  retryAfterMs?: number;
}

interface HeartbeatMessage {
  type: "heartbeat";
}

interface SubscribeMessage {
  action: "subscribe";
  channel: string;
  lastCursor?: string;
}

type SocketRole = "active" | "replacement" | "draining";

type RealtimeMessage =
  | RealtimeEvent
  | DrainControlMessage
  | HeartbeatMessage;

export interface RealtimeEvent {
  type: string;
  message: unknown;
  id?: string;
  timestamp: number;
  _cursor?: string;
}

export interface RealtimeConfig {
  apiKey: string;
  heartbeatInterval?: number;
  reconnectDelay?: number;
  missedHeartbeatsLimit?: number;
}

const isDrainControlMessage = (
  message: RealtimeMessage,
): message is DrainControlMessage => message.type === "control.draining";

const isRealtimeEvent = (message: RealtimeMessage): message is RealtimeEvent =>
  message.type !== "heartbeat" && message.type !== "control.draining";

export class Realtime {
  private static readonly DEFAULT_RECONNECT_DELAY_MS = 5_000;
  private static readonly MAX_RECONNECT_DELAY_MS = 60_000;
  private activeSocket?: WebSocket;
  private drainingSockets: Set<WebSocket> = new Set();
  private heartbeatInterval: number;
  private reconnectDelay: number;
  private lastHeartbeat: number = Date.now();
  private isConnecting: boolean = false;
  private missedHeartbeatsLimit: number;
  private missedHeartbeatCheckTimer?: ReturnType<typeof setInterval>;
  private apiKey?: string;
  private eventListeners: Set<(event: RealtimeEvent) => void> = new Set();
  private connectionListeners: Set<
    (connected: boolean, reason?: string) => void
  > = new Set();
  private errorListeners: Set<(error: unknown) => void> = new Set();
  private isClosed: boolean = false;
  private lastCursor?: string;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private hasConnectedOnce: boolean = false;
  private readonly recentEventIds: Set<string> = new Set();
  private readonly recentEventIdQueue: string[] = [];
  private readonly maxRecentEventIds = 1000;

  constructor(config: RealtimeConfig) {
    this.apiKey = config.apiKey;
    this.heartbeatInterval = config.heartbeatInterval || 10000;
    this.reconnectDelay = this.normalizeReconnectDelay(config.reconnectDelay);
    this.missedHeartbeatsLimit = config.missedHeartbeatsLimit || 30000;
  }

  public async connect(): Promise<void> {
    if (this.isClosed || this.isConnecting || this.activeSocket) {
      return;
    }

    this.isConnecting = true;

    try {
      const { access_token, team_id } = await this.getOAuthToken();
      await this.openSocket(access_token, team_id, "active");
      this.hasConnectedOnce = true;
    } catch (err) {
      debug("Failed to connect: %O", err);
      this.isConnecting = false;
      this.notifyErrorListeners(err);
      if (!this.hasConnectedOnce) {
        throw err;
      }
      this.scheduleReconnect();
    }
  }

  private async getOAuthToken(): Promise<{
    access_token: string;
    team_id: string;
  }> {
    const response = await fetch(`${PUBLIC_API_URI}/v4/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": `${this.apiKey}`,
        "x-sdk-version": SDK_VERSION,
      },
    });

    return (await response.json()) as {
      access_token: string;
      team_id: string;
    };
  }

  private async openSocket(
    accessToken: string,
    teamId: string,
    role: Extract<SocketRole, "active" | "replacement">,
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(
        `${WSS_API_URI}?access_token=${accessToken}`,
      );
      let settled = false;

      socket.onopen = () => {
        const subscribeMessage: SubscribeMessage = {
          action: "subscribe",
          channel: teamId,
        };

        if (this.lastCursor) {
          subscribeMessage.lastCursor = this.lastCursor;
        }

        socket.send(JSON.stringify(subscribeMessage));
        this.promoteSocket(socket, role);
        this.isConnecting = false;
        this.lastHeartbeat = Date.now();
        this.startHeartbeatCheck();
        debug("Connected to WebSocket");

        if (!settled) {
          settled = true;
          resolve();
        }
      };

      socket.onmessage = (event) => {
        this.handleSocketMessage(socket, event.data);
      };

      socket.onclose = () => {
        this.handleSocketClose(socket);
        if (!settled) {
          settled = true;
          reject(new Error("WebSocket closed before opening"));
        }
      };

      socket.onerror = (error) => {
        this.notifyErrorListeners(error);
        if (!settled) {
          settled = true;
          reject(error);
          return;
        }

        if (socket === this.activeSocket) {
          this.handleUnexpectedDisconnect("Socket error");
        }
      };
    });
  }

  private promoteSocket(
    socket: WebSocket,
    role: Extract<SocketRole, "active" | "replacement">,
  ) {
    if (
      role === "replacement" &&
      this.activeSocket &&
      this.activeSocket !== socket
    ) {
      this.drainingSockets.add(this.activeSocket);
    }

    this.activeSocket = socket;
    this.drainingSockets.delete(socket);

    if (role === "active" || !this.hasConnectedOnce) {
      this.notifyConnectionListeners(true);
    }
  }

  private handleSocketMessage(
    socket: WebSocket,
    rawData: string | ArrayBufferLike | Blob | ArrayBufferView,
  ) {
    try {
      const payload =
        typeof rawData === "string" ? rawData : (rawData.toString?.() ?? "");
      const data = JSON.parse(payload) as RealtimeMessage;

      if (data.type === "heartbeat") {
        if (socket === this.activeSocket) {
          this.handleHeartbeat();
        }
        return;
      }

      if (isDrainControlMessage(data)) {
        this.handleDrainSignal(socket, data);
        return;
      }

      if (!isRealtimeEvent(data)) {
        return;
      }

      if (typeof data._cursor === "string") {
        this.lastCursor = data._cursor;
      }

      if (typeof data.id === "string") {
        fetch(`${REALTIME_API_URI}/api/v1/events/ack`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: data.id }),
        }).catch((error) => {
          debug("Failed to acknowledge event %s: %O", data.id, error);
        });
      }

      if (this.isDuplicateEvent(data.id)) {
        return;
      }

      this.notifyEventListeners(data);
    } catch (err) {
      debug("Failed to parse incoming message: %O", err);
    }
  }

  private handleDrainSignal(socket: WebSocket, message: DrainControlMessage) {
    if (socket !== this.activeSocket || this.isClosed) {
      return;
    }

    debug("Received drain signal, preparing replacement socket");
    this.drainingSockets.add(socket);
    this.scheduleDrainReconnect(message.retryAfterMs);
  }

  private handleSocketClose(socket: WebSocket) {
    const wasActiveSocket = socket === this.activeSocket;

    this.drainingSockets.delete(socket);

    if (!wasActiveSocket) {
      return;
    }

    this.activeSocket = undefined;
    this.stopHeartbeatCheck();

    if (this.isClosed) {
      return;
    }

    if (this.drainingSockets.size > 0) {
      debug("Draining socket closed after replacement was scheduled");
      return;
    }

    this.handleUnexpectedDisconnect("Connection closed");
  }

  private handleUnexpectedDisconnect(reason: string) {
    this.isConnecting = false;
    this.notifyConnectionListeners(false, reason);
    this.scheduleReconnect();
  }

  private scheduleReconnect(replacement = false) {
    if (this.isClosed || this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = undefined;
      if (
        this.isClosed ||
        this.isConnecting ||
        (!replacement && this.activeSocket)
      ) {
        return;
      }

      this.isConnecting = true;

      try {
        const { access_token, team_id } = await this.getOAuthToken();
        await this.openSocket(
          access_token,
          team_id,
          replacement ? "replacement" : "active",
        );
      } catch (err) {
        debug("Reconnect failed: %O", err);
        this.isConnecting = false;
        this.notifyErrorListeners(err);
        this.scheduleReconnect(replacement);
      }
    }, this.reconnectDelay);
  }

  private scheduleDrainReconnect(retryAfterMs?: number) {
    if (this.isClosed || this.reconnectTimer) {
      return;
    }

    let safeDelayMs = this.reconnectDelay;
    if (
      typeof retryAfterMs === "number" &&
      Number.isFinite(retryAfterMs) &&
      retryAfterMs >= 0 &&
      retryAfterMs <= Realtime.MAX_RECONNECT_DELAY_MS
    ) {
      safeDelayMs = Math.trunc(retryAfterMs);
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = undefined;
      if (this.isClosed || this.isConnecting) {
        return;
      }

      this.isConnecting = true;

      try {
        const { access_token, team_id } = await this.getOAuthToken();
        await this.openSocket(access_token, team_id, "replacement");
      } catch (err) {
        debug("Reconnect failed: %O", err);
        this.isConnecting = false;
        this.notifyErrorListeners(err);
        this.scheduleReconnect(true);
      }
    }, safeDelayMs);
  }

  private normalizeReconnectDelay(delay?: number): number {
    if (typeof delay !== "number" || !Number.isFinite(delay)) {
      return Realtime.DEFAULT_RECONNECT_DELAY_MS;
    }

    return Math.min(
      Math.max(0, Math.trunc(delay)),
      Realtime.MAX_RECONNECT_DELAY_MS,
    );
  }

  private isDuplicateEvent(eventId?: string): boolean {
    if (!eventId) {
      return false;
    }

    if (this.recentEventIds.has(eventId)) {
      return true;
    }

    this.recentEventIds.add(eventId);
    this.recentEventIdQueue.push(eventId);

    if (this.recentEventIdQueue.length > this.maxRecentEventIds) {
      const expiredId = this.recentEventIdQueue.shift();
      if (expiredId) {
        this.recentEventIds.delete(expiredId);
      }
    }

    return false;
  }

  private handleHeartbeat() {
    debug("Heartbeat received");
    this.lastHeartbeat = Date.now();
  }

  private notifyEventListeners(event: RealtimeEvent) {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        debug("Error in event listener: %O", error);
      }
    });
  }

  private notifyConnectionListeners(connected: boolean, reason?: string) {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(connected, reason);
      } catch (error) {
        debug("Error in connection listener: %O", error);
      }
    });
  }

  private notifyErrorListeners(error: unknown) {
    this.errorListeners.forEach((listener) => {
      try {
        listener(error);
      } catch (listenerError) {
        debug("Error in error listener: %O", listenerError);
      }
    });
  }

  private startHeartbeatCheck() {
    this.stopHeartbeatCheck();
    this.missedHeartbeatCheckTimer = setInterval(() => {
      if (
        this.activeSocket &&
        Date.now() - this.lastHeartbeat > this.missedHeartbeatsLimit
      ) {
        debug("No heartbeat received in 30 seconds! Closing connection.");
        this.activeSocket.close();
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeatCheck() {
    if (this.missedHeartbeatCheckTimer) {
      clearInterval(this.missedHeartbeatCheckTimer);
      this.missedHeartbeatCheckTimer = undefined;
    }
  }

  /**
   * Subscribe to realtime events
   * @param listener Function to handle incoming events
   * @returns Function to unsubscribe
   */
  public onEvent(listener: (event: RealtimeEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  /**
   * Subscribe to connection state changes
   * @param listener Function to handle connection state changes
   * @returns Function to unsubscribe
   */
  public onConnection(
    listener: (connected: boolean, reason?: string) => void,
  ): () => void {
    this.connectionListeners.add(listener);
    if (this.isConnected()) {
      listener(true);
    }
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * Subscribe to errors
   * @param listener Function to handle errors
   * @returns Function to unsubscribe
   */
  public onError(listener: (error: unknown) => void): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  public close() {
    this.isClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.stopHeartbeatCheck();
    this.activeSocket?.close();
    this.activeSocket = undefined;
    this.drainingSockets.forEach((socket) => {
      socket.close();
    });
    this.drainingSockets.clear();
    this.isConnecting = false;

    // Clear all listeners
    this.eventListeners.clear();
    this.connectionListeners.clear();
    this.errorListeners.clear();
  }

  public isConnected(): boolean {
    return this.activeSocket?.readyState === WebSocket.OPEN;
  }
}
