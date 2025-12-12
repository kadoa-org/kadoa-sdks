import {
  PUBLIC_API_URI,
  REALTIME_API_URI,
  WSS_API_URI,
  WSS_NEO_API_URI,
} from "../../runtime/config";
import { logger } from "../../runtime/logger";
import { SDK_VERSION } from "../../version";

const debug = logger.wss;

// if WebSocket doesn't exist in the global scope, import it
if (typeof WebSocket === "undefined") {
  global.WebSocket = require("ws");
}

export interface RealtimeConfig {
  apiKey: string;
  heartbeatInterval?: number;
  reconnectDelay?: number;
  missedHeartbeatsLimit?: number;
  /** Subscribe source mode. Use 'stream' for CloudEvents mode. */
  source?: "stream";
}

export class Realtime {
  private socket?: WebSocket;
  private heartbeatInterval: number;
  private reconnectDelay: number;
  private lastHeartbeat: number = Date.now();
  private isConnecting: boolean = false;
  private missedHeartbeatsLimit: number;
  private missedHeartbeatCheckTimer?: ReturnType<typeof setInterval>;
  private apiKey?: string;
  private source?: "stream";
  private eventListeners: Set<(event: unknown) => void> = new Set();
  private connectionListeners: Set<
    (connected: boolean, reason?: string) => void
  > = new Set();
  private errorListeners: Set<(error: unknown) => void> = new Set();

  constructor(config: RealtimeConfig) {
    this.apiKey = config.apiKey;
    this.heartbeatInterval = config.heartbeatInterval || 10000;
    this.reconnectDelay = config.reconnectDelay || 5000;
    this.missedHeartbeatsLimit = config.missedHeartbeatsLimit || 30000;
    this.source = config.source;
  }

  public async connect() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const response = await fetch(`${PUBLIC_API_URI}/v4/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": `${this.apiKey}`,
          "x-sdk-version": SDK_VERSION,
        },
      });

      const { access_token, team_id } = (await response.json()) as {
        access_token: string;
        team_id: string;
      };

      const wssUri = this.source === "stream" ? WSS_NEO_API_URI : WSS_API_URI;
      const tokenParam = this.source === "stream" ? "token" : "access_token";
      this.socket = new WebSocket(`${wssUri}?${tokenParam}=${access_token}`);

      this.socket.onopen = () => {
        this.isConnecting = false;
        this.lastHeartbeat = Date.now();

        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(
            JSON.stringify({
              action: "subscribe",
              channel: team_id,
              ...(this.source && { source: this.source }),
            }),
          );
          debug("Connected to WebSocket");
          this.notifyConnectionListeners(true);
        }
        this.startHeartbeatCheck();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "heartbeat") {
            this.handleHeartbeat();
          } else {
            if (data?.id) {
              fetch(`${REALTIME_API_URI}/api/v1/events/ack`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: data.id }),
              });
            }
            this.notifyEventListeners(data);
          }
        } catch (err) {
          debug("Failed to parse incoming message: %O", err);
        }
      };

      this.socket.onclose = () => {
        debug("WebSocket disconnected. Attempting to reconnect...");
        this.isConnecting = false;
        this.stopHeartbeatCheck();
        this.notifyConnectionListeners(false, "Connection closed");
        setTimeout(() => this.connect(), this.reconnectDelay);
      };

      this.socket.onerror = (error) => {
        debug("WebSocket error: %O", error);
        this.isConnecting = false;
        this.notifyErrorListeners(error);
      };
    } catch (err) {
      debug("Failed to connect: %O", err);
      this.isConnecting = false;
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  private handleHeartbeat() {
    debug("Heartbeat received");
    this.lastHeartbeat = Date.now();
  }

  private notifyEventListeners(event: unknown) {
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
      } catch (error) {
        debug("Error in error listener: %O", error);
      }
    });
  }

  private startHeartbeatCheck() {
    this.missedHeartbeatCheckTimer = setInterval(() => {
      if (Date.now() - this.lastHeartbeat > this.missedHeartbeatsLimit) {
        debug("No heartbeat received in 30 seconds! Closing connection.");
        this.socket?.close();
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeatCheck() {
    if (this.missedHeartbeatCheckTimer) {
      clearInterval(this.missedHeartbeatCheckTimer);
    }
  }

  /**
   * Subscribe to realtime events
   * @param listener Function to handle incoming events
   * @returns Function to unsubscribe
   */
  public onEvent(listener: (event: unknown) => void): () => void {
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
    if (this.socket) {
      this.stopHeartbeatCheck();
      this.socket.close();
      this.socket = undefined;
    }
    // Clear all listeners
    this.eventListeners.clear();
    this.connectionListeners.clear();
    this.errorListeners.clear();
  }

  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
