import { EventEmitter } from "node:events";
import type { EventPayloadMap } from "./event-types";

/**
 * Unified event structure with discriminated union
 */
export interface KadoaEvent<
  T extends keyof EventPayloadMap = keyof EventPayloadMap,
> {
  /** Event type identifier */
  type: T;
  /** ISO timestamp when the event occurred */
  timestamp: Date;
  /** Module or component that emitted the event */
  source: string;
  /** Event-specific payload */
  payload: EventPayloadMap[T];
  /** Optional metadata for debugging and tracking */
  metadata?: Record<string, unknown>;
}

/**
 * Type aliases for convenience
 */
export type KadoaEventName = keyof EventPayloadMap;
export type KadoaEventPayload<T extends KadoaEventName> = EventPayloadMap[T];
export type AnyKadoaEvent = KadoaEvent<KadoaEventName>;

/**
 * Simplified type-safe event emitter for Kadoa SDK events
 */
export class KadoaEventEmitter extends EventEmitter {
  /**
   * Emit a typed SDK event
   */
  emit<T extends KadoaEventName>(
    eventName: T,
    payload: EventPayloadMap[T],
    source = "sdk",
    metadata?: Record<string, unknown>,
  ): boolean {
    const event: KadoaEvent<T> = {
      type: eventName,
      timestamp: new Date(),
      source,
      payload,
      metadata,
    };

    // Single emission to "event" channel
    return super.emit("event", event);
  }

  /**
   * Subscribe to SDK events
   */
  onEvent(listener: (event: AnyKadoaEvent) => void): this {
    return super.on("event", listener);
  }

  /**
   * Subscribe to SDK events (once)
   */
  onceEvent(listener: (event: AnyKadoaEvent) => void): this {
    return super.once("event", listener);
  }

  /**
   * Unsubscribe from SDK events
   */
  offEvent(listener: (event: AnyKadoaEvent) => void): this {
    return super.off("event", listener);
  }

  /**
   * Remove all event listeners
   */
  removeAllEventListeners(): this {
    return super.removeAllListeners("event");
  }
}
