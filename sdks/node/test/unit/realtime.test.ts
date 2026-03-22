import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  Realtime,
  type RealtimeEvent,
} from "../../src/domains/realtime/realtime";

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  public readonly url: string;
  public readyState = FakeWebSocket.CONNECTING;
  public sent: string[] = [];
  public onopen?: () => void;
  public onmessage?: (event: { data: string }) => void;
  public onclose?: () => void;
  public onerror?: (error: unknown) => void;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  message(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  close() {
    if (this.readyState === FakeWebSocket.CLOSED) {
      return;
    }
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  fail(error: unknown) {
    this.onerror?.(error);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForSocket = async (index: number) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const socket = FakeWebSocket.instances[index];
    if (socket) {
      return socket;
    }
    await sleep(1);
  }

  throw new Error(`Timed out waiting for socket ${index}`);
};

describe("Realtime", () => {
  const originalFetch = global.fetch;
  const originalWebSocket = global.WebSocket;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    global.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.WebSocket = originalWebSocket;
  });

  test("reconnects on drain using lastCursor and dedupes overlapping events", async () => {
    const fetchCalls: Array<{ url: string; body?: string }> = [];
    let tokenCallCount = 0;

    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetchCalls.push({ url, body: init?.body?.toString() });

      if (url.includes("/v4/oauth2/token")) {
        tokenCallCount += 1;
        return {
          json: async () => ({
            access_token: `token-${tokenCallCount}`,
            team_id: "team-123",
          }),
        } as Response;
      }

      return {
        json: async () => ({}),
      } as Response;
    }) as typeof fetch;

    const realtime = new Realtime({
      apiKey: "test-key",
      reconnectDelay: 2,
      heartbeatInterval: 50,
      missedHeartbeatsLimit: 5_000,
    });

    const connectionStates: Array<{ connected: boolean; reason?: string }> = [];
    const events: RealtimeEvent[] = [];

    realtime.onConnection((connected, reason) => {
      connectionStates.push({ connected, reason });
    });
    realtime.onEvent((event) => {
      events.push(event);
    });

    const connectPromise = realtime.connect();
    const firstSocket = await waitForSocket(0);
    firstSocket.open();
    await connectPromise;

    expect(JSON.parse(firstSocket.sent[0])).toEqual({
      action: "subscribe",
      channel: "team-123",
    });

    firstSocket.message({
      type: "workflow.updated",
      id: "event-1",
      _cursor: "cursor-1",
      timestamp: 1,
      message: { status: "running" },
    });

    firstSocket.message({
      type: "control.draining",
      retryAfterMs: 1,
    });

    await sleep(5);

    const secondSocket = await waitForSocket(1);
    secondSocket.open();
    await sleep(1);

    expect(JSON.parse(secondSocket.sent[0])).toEqual({
      action: "subscribe",
      channel: "team-123",
      lastCursor: "cursor-1",
    });

    firstSocket.message({
      type: "workflow.updated",
      id: "event-1",
      _cursor: "cursor-1",
      timestamp: 1,
      message: { status: "running" },
    });
    secondSocket.message({
      type: "workflow.updated",
      id: "event-1",
      _cursor: "cursor-1",
      timestamp: 1,
      message: { status: "running" },
    });
    secondSocket.message({
      type: "workflow.updated",
      id: "event-2",
      _cursor: "cursor-2",
      timestamp: 2,
      message: { status: "done" },
    });

    firstSocket.close();

    expect(events.map((event) => event.id)).toEqual(["event-1", "event-2"]);
    expect(connectionStates).toEqual([{ connected: true }]);
    expect(
      fetchCalls.filter((call) => call.url.includes("/api/v1/events/ack")),
    ).toHaveLength(4);

    realtime.close();
  });

  test("emits disconnect and reconnects after unexpected close", async () => {
    let tokenCallCount = 0;

    global.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/v4/oauth2/token")) {
        tokenCallCount += 1;
        return {
          json: async () => ({
            access_token: `token-${tokenCallCount}`,
            team_id: "team-123",
          }),
        } as Response;
      }

      return {
        json: async () => ({}),
      } as Response;
    }) as typeof fetch;

    const realtime = new Realtime({
      apiKey: "test-key",
      reconnectDelay: 2,
      heartbeatInterval: 50,
      missedHeartbeatsLimit: 5_000,
    });

    const connectionStates: Array<{ connected: boolean; reason?: string }> = [];
    realtime.onConnection((connected, reason) => {
      connectionStates.push({ connected, reason });
    });

    const connectPromise = realtime.connect();
    const firstSocket = await waitForSocket(0);
    firstSocket.open();
    await connectPromise;

    firstSocket.close();
    await sleep(5);

    const secondSocket = await waitForSocket(1);
    secondSocket.open();
    await sleep(1);

    expect(connectionStates).toEqual([
      { connected: true },
      { connected: false, reason: "Connection closed" },
      { connected: true },
    ]);

    realtime.close();
  });
});
