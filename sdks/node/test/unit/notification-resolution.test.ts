import { afterAll, beforeEach, expect, test } from "bun:test";
import type {
  NotificationDeliveryConfig,
  NotificationSettingsEventType,
} from "../../src";

const { KadoaClient }: typeof import("../../src") = await import(
  process.env.SDK_ENTRY ?? "../../src"
);

type Channel = {
  id: string;
  name: string;
  channelType: string;
  config: NotificationDeliveryConfig;
  reused?: boolean;
};
type Setting = {
  id: string;
  workflowId: string | null;
  eventType: string;
  enabled: boolean;
  channels: Channel[];
  eventConfiguration?: object;
};
type Body = {
  name: string;
  channelType: string;
  config: NotificationDeliveryConfig;
  channelIds: string[];
  expectedChannelIds?: string[];
  workflowId: string;
  eventType: string;
  enabled: boolean;
};
let channels: Channel[] = [];
let settings: Setting[] = [];
let writes: Body[] = [];
let failReadback = false;
let committed = false;
const api = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(req) {
    const url = new URL(req.url),
      path = url.pathname;
    const body = (req.method === "GET" ? {} : await req.json()) as Body;
    const ok = (data: unknown, status = 200) =>
      Response.json({ data, status: "success" }, { status });
    if (path === "/v5/user")
      return Response.json({ userId: "user", email: "owner@example.com" });
    if (path === "/v5/notifications/channels") {
      if (req.method === "GET") return ok({ channels });
      const channel = {
        ...body,
        id: `channel-${channels.length}`,
        reused: false,
      };
      channels.push(channel);
      writes.push(body);
      return ok({ channel }, 201);
    }
    if (path === "/v5/notifications/settings" && req.method === "GET") {
      if (failReadback && committed)
        return Response.json(
          { message: "readback unavailable" },
          { status: 503 },
        );
      const w = url.searchParams.get("workflowId");
      return ok({
        settings: settings.filter(
          (s) => !w || s.workflowId === (w === "null" ? null : w),
        ),
      });
    }
    if (
      path.startsWith("/v5/notifications/settings") &&
      ["PUT", "POST"].includes(req.method)
    ) {
      writes.push(body);
      const s =
        req.method === "PUT"
          ? settings.find((s) => s.id === path.split("/").at(-1))
          : { id: `setting-${settings.length}`, ...body };
      if (!s)
        return Response.json({ message: "missing setting" }, { status: 404 });
      if (req.method === "POST") settings.push(s);
      Object.assign(s, body, {
        channels: body.channelIds.map((id: string) =>
          channels.find((c) => c.id === id),
        ),
      });
      committed = true;
      return ok({ settings: s }, req.method === "POST" ? 201 : 200);
    }
    return Response.json(
      { message: "unexpected fixture route" },
      { status: 501 },
    );
  },
});
const client = new KadoaClient({
  apiKey: "fixture",
  baseUrl: `http://127.0.0.1:${api.port}`,
  checkForUpdates: false,
});
afterAll(() => {
  client.dispose();
  api.stop(true);
});
beforeEach(() => {
  channels = [];
  settings = [];
  writes = [];
  failReadback = false;
  committed = false;
});
const seed = (
  id: string,
  config: object,
  channelType = "EMAIL",
  name = "Existing",
) => {
  const c = {
    id,
    name,
    config,
    channelType,
    createdAt: "2026-01-01T00:00:00Z",
  };
  channels.push(c);
  return c;
};

test("direct SDK setup reuses a matching destination under another name", async () => {
  seed("maxime", { recipients: ["maxime@example.com"] });
  const socket = seed("socket", {}, "WEBSOCKET");
  settings.push({
    id: "alert",
    workflowId: "workflow",
    eventType: "workflow_data_change",
    enabled: false,
    eventConfiguration: { frequency: 7 },
    channels: [socket],
  });
  const result = await client.notification.configure({
    workflowId: "workflow",
    events: ["workflow_data_change"],
    channels: {
      EMAIL: { name: "New name", recipients: ["Maxime@Example.com"] },
    },
  });
  expect(channels).toHaveLength(2);
  expect(result[0].id).toBe("alert");
  expect(result[0].channels?.map((c) => c.id).sort()).toEqual([
    "maxime",
    "socket",
  ]);
  expect(result[0].enabled).toBe(false);
  expect(result[0].eventConfiguration).toEqual({ frequency: 7 });
  expect(writes.at(-1).expectedChannelIds).toEqual(["socket"]);
});

test("workspace setup updates only the workspace event and is repeatable", async () => {
  const wrong = seed("workflow-email", { recipients: ["other@example.com"] });
  const right = seed("workspace-email", { recipients: ["owner@example.com"] });
  settings.push({
    id: "workflow-alert",
    workflowId: "workflow",
    eventType: "workflow_data_change",
    enabled: true,
    channels: [wrong],
  });
  settings.push({
    id: "workspace-alert",
    workflowId: null,
    eventType: "workflow_data_change",
    enabled: true,
    channels: [right],
  });
  const request = {
    events: ["workflow_data_change"] as NotificationSettingsEventType[],
    channels: { EMAIL: true },
  } as const;
  await client.notification.setup.setupForWorkspace(request);
  await client.notification.setup.setupForWorkspace(request);
  expect(settings[0].channels.map((c: Channel) => c.id)).toEqual([
    "workflow-email",
  ]);
  expect(settings[1].channels.map((c: Channel) => c.id)).toEqual([
    "workspace-email",
  ]);
  expect(writes).toHaveLength(0);
});

test("group coverage is local to each event, preserving other recipients without duplicate mail", async () => {
  const group = seed("group", {
    recipients: ["maxime@example.com", "julius@example.com"],
  });
  const socket = seed("socket", {}, "WEBSOCKET");
  settings.push({
    id: "data",
    workflowId: "workflow",
    eventType: "workflow_data_change",
    enabled: true,
    channels: [group],
  });
  settings.push({
    id: "failed",
    workflowId: "workflow",
    eventType: "workflow_failed",
    enabled: true,
    channels: [socket],
  });
  await client.notification.configure({
    workflowId: "workflow",
    events: ["workflow_data_change", "workflow_failed"],
    channels: { EMAIL: { recipients: ["maxime@example.com"] } },
  });
  expect(settings[0].channels.map((c: Channel) => c.id)).toEqual(["group"]);
  expect(
    settings[1].channels
      .map((c: Channel) => c.config.recipients)
      .filter(Boolean),
  ).toEqual([["maxime@example.com"]]);
  expect(channels.find((c) => c.id === "group").config.recipients).toEqual([
    "maxime@example.com",
    "julius@example.com",
  ]);
  expect(channels).toHaveLength(3);
});

test("setup does not report completion without saved-state verification", async () => {
  failReadback = true;
  await expect(
    client.notification.configure({
      workflowId: "workflow",
      events: ["workflow_data_change"],
      channels: { EMAIL: { recipients: ["new@example.com"] } },
    }),
  ).rejects.toThrow();
  expect(settings).toHaveLength(1);
});

test.each([
  [
    "EMAIL",
    { recipients: [" Maxime@Example.com ", "maxime@example.com"] },
    { recipients: ["maxime@example.com"] },
    true,
  ],
  [
    "EMAIL",
    { recipients: ["maxime@example.com", "julius@example.com"] },
    { recipients: ["maxime@example.com"] },
    false,
  ],
  [
    "WEBHOOK",
    {
      webhookUrl: "https://example.com/hook",
      httpMethod: "POST",
      auth: { type: "bearer", token: "one" },
    },
    {
      webhookUrl: "https://example.com/hook",
      auth: { type: "bearer", token: "one" },
    },
    true,
  ],
  [
    "WEBHOOK",
    {
      webhookUrl: "https://example.com/hook",
      auth: { type: "bearer", token: "one" },
    },
    {
      webhookUrl: "https://example.com/hook",
      auth: { type: "bearer", token: "two" },
    },
    false,
  ],
  [
    "WEBHOOK",
    { webhookUrl: "https://example.com/hook", httpMethod: "PUT" },
    { webhookUrl: "https://example.com/hook", httpMethod: "POST" },
    false,
  ],
  [
    "SLACK",
    { slackChannelId: "channel", integrationId: "workspace-a" },
    { slackChannelId: "channel", integrationId: "workspace-b" },
    false,
  ],
  [
    "SLACK",
    {
      slackChannelId: "channel",
      integrationId: "workspace-a",
      slackChannelName: "Old label",
    },
    {
      slackChannelId: "channel",
      integrationId: "workspace-a",
      slackChannelName: "Renamed",
    },
    true,
  ],
  [
    "SLACK",
    { webhookUrl: "https://example.com/slack" },
    { webhookUrl: "https://example.com/slack" },
    true,
  ],
  ["WEBSOCKET", {}, {}, true],
] as const)("resolveChannel compares delivery configuration: %s %j versus %j", async (type, existing, requested, reuse) => {
  seed("existing", existing, type, "Same display name");
  const result = await client.notification.channels.resolveChannel(type, {
    name: "Same display name",
    config: requested,
  });
  expect(result.reused).toBe(reuse);
  expect(result.channel.id === "existing").toBe(reuse);
  expect(channels).toHaveLength(reuse ? 1 : 2);
});

test("duplicate historical destinations prefer attached IDs deterministically", async () => {
  seed("older", { recipients: ["owner@example.com"] });
  seed("attached", { recipients: ["owner@example.com"] });
  const result = await client.notification.channels.resolveChannel(
    "EMAIL",
    {},
    ["attached"],
  );
  expect(result.channel.id).toBe("attached");
  expect(result.reused).toBe(true);
  expect(writes).toHaveLength(0);
});

test("email resolution preserves the requested sender", async () => {
  seed("old-sender", {
    recipients: ["owner@example.com"],
    from: "old@kadoa.com",
  });
  const result = await client.notification.channels.resolveChannel("EMAIL", {
    config: { recipients: ["owner@example.com"], from: "new@kadoa.com" },
  });
  expect(result.reused).toBe(false);
  expect((result.channel.config as NotificationDeliveryConfig).from).toBe(
    "new@kadoa.com",
  );
});

test("group coverage respects the requested sender", async () => {
  const group = seed("old-group", {
    recipients: ["owner@example.com", "other@example.com"],
    from: "old@kadoa.com",
  });
  const result = await client.notification.setup.setupChannels({
    channels: {
      EMAIL: { recipients: ["owner@example.com"], from: "new@kadoa.com" },
    },
    preferredChannelIds: [group.id],
  });
  expect(
    result.map((c) => (c.config as NotificationDeliveryConfig).from),
  ).toEqual(["new@kadoa.com"]);
  expect(group.config.from).toBe("old@kadoa.com");
});

test("setup rejects an existing channel with a different requested type", async () => {
  seed("email", { recipients: ["owner@example.com"] });
  await expect(
    client.notification.setup.setupChannels({
      channels: { WEBSOCKET: { channelId: "email" } },
    }),
  ).rejects.toThrow();
  expect(writes).toHaveLength(0);
});
