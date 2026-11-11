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
let rejectEvent: string | undefined;
let channelLists = 0;
let userReads = 0;
const api = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(req) {
    const url = new URL(req.url),
      path = url.pathname;
    const body = (req.method === "GET" ? {} : await req.json()) as Body;
    const ok = (data: unknown, status = 200) =>
      Response.json({ data, status: "success" }, { status });
    if (path === "/v5/user") {
      userReads++;
      return Response.json({ userId: "user", email: "owner@example.com" });
    }
    if (path === "/v5/notifications/channels") {
      if (req.method === "GET") {
        channelLists++;
        return ok({ channels });
      }
      if (
        channels.some(
          (c) => c.name === body.name && c.channelType === body.channelType,
        )
      )
        return Response.json(
          { message: "channel name conflict" },
          { status: 409 },
        );
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
      const s =
        req.method === "PUT"
          ? settings.find((s) => s.id === path.split("/").at(-1))
          : {
              id: `setting-${settings.length}`,
              ...body,
              workflowId: body.workflowId ?? null,
            };
      if (!s)
        return Response.json({ message: "missing setting" }, { status: 404 });
      if (
        s.eventType === rejectEvent ||
        (req.method === "PUT" &&
          body.expectedChannelIds &&
          JSON.stringify([...body.expectedChannelIds].sort()) !==
            JSON.stringify(s.channels.map((c) => c.id).sort()))
      )
        return Response.json({ message: "setting conflict" }, { status: 409 });
      if (
        req.method === "POST" &&
        settings.some(
          (other) =>
            other.workflowId === (body.workflowId ?? null) &&
            other.eventType === body.eventType,
        )
      )
        return Response.json({ message: "duplicate setting" }, { status: 409 });
      writes.push(body);
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
  rejectEvent = undefined;
  channelLists = 0;
  userReads = 0;
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

test("default email setup reuses the event's group coverage", async () => {
  const group = seed("owner-group", {
    recipients: ["owner@example.com", "colleague@example.com"],
  });
  settings.push({
    id: "alert",
    workflowId: "workflow",
    eventType: "workflow_data_change",
    enabled: true,
    channels: [group],
  });
  await client.notification.configure({
    workflowId: "workflow",
    events: ["workflow_data_change"],
    channels: { EMAIL: true },
  });
  expect(channels).toHaveLength(1);
  expect(settings[0].channels.map((c) => c.id)).toEqual(["owner-group"]);
  expect(writes).toHaveLength(0);
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

test("workspace setup creates and verifies a missing workspace event", async () => {
  const result = await client.notification.setup.setupForWorkspace({
    events: ["workflow_data_change"],
    channels: { EMAIL: true },
  });
  expect(result).toHaveLength(1);
  expect(result[0].workflowId).toBeNull();
  expect(result[0].channels?.map((c) => c.config?.recipients)).toEqual([
    ["owner@example.com"],
  ]);
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

test("setup identifies a committed setting when saved-state readback is unavailable", async () => {
  failReadback = true;
  await expect(
    client.notification.configure({
      workflowId: "workflow",
      events: ["workflow_data_change"],
      channels: { EMAIL: { recipients: ["new@example.com"] } },
    }),
  ).rejects.toMatchObject({
    details: { outcome: "applied_unverified", settingId: "setting-0" },
    cause: { httpStatus: 503 },
  });
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

test.each([
  [
    {
      slackChannelId: "C1",
      slackChannelName: "alerts",
      webhookUrl: "https://example.com/slack-one",
    },
    {
      slackChannelId: "C1",
      slackChannelName: "alerts",
      webhookUrl: "https://example.com/slack-two",
    },
  ],
  [
    { slackChannelId: "C1", integrationId: "one" },
    { slackChannelId: "C1", workspaceId: "one" },
  ],
])("Slack resolution preserves the backend's complete destination identity: %j versus %j", async (existing, requested) => {
  seed("existing", existing, "SLACK");
  const result = await client.notification.channels.resolveChannel("SLACK", {
    config: requested,
  });
  expect(result.reused).toBe(false);
  expect(result.channel.config).toEqual(requested);
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

test("repeated events do not conflict with the same request's first update", async () => {
  const socket = seed("socket", {}, "WEBSOCKET");
  settings.push({
    id: "alert",
    workflowId: "workflow",
    eventType: "workflow_data_change",
    enabled: true,
    channels: [socket],
  });
  const result = await client.notification.configure({
    workflowId: "workflow",
    events: ["workflow_data_change", "workflow_data_change"],
    channels: { EMAIL: true },
  });
  expect(result).toHaveLength(1);
  expect(settings[0].channels.map((c) => c.channelType).sort()).toEqual([
    "EMAIL",
    "WEBSOCKET",
  ]);
  expect(writes.filter((w) => w.channelIds)).toHaveLength(1);
});

test.each([
  "",
  "   ",
])("blank workflow scope %j cannot select another workflow's setting", async (workflowId) => {
  const socket = seed("socket", {}, "WEBSOCKET");
  settings.push({
    id: "other",
    workflowId: "other-workflow",
    eventType: "workflow_data_change",
    enabled: true,
    channels: [socket],
  });
  await expect(
    client.notification.configure({
      workflowId,
      events: ["workflow_data_change"],
      channels: { EMAIL: true },
    }),
  ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  expect(writes).toHaveLength(0);
  expect(settings[0].channels.map((c) => c.id)).toEqual(["socket"]);
});

test("missing explicit channel errors retain the requested ID and type", async () => {
  await expect(
    client.notification.setup.setupChannels({
      channels: { EMAIL: { channelId: "missing" } },
    }),
  ).rejects.toMatchObject({
    code: "NOT_FOUND",
    details: { channelId: "missing", channelType: "EMAIL" },
  });
  expect(writes).toHaveLength(0);
});

test("generated names find an available suffix when the first two names are occupied", async () => {
  const original = await client.notification.channels.resolveChannel("EMAIL", {
    config: { recipients: ["requested@example.com"] },
  });
  const base = original.channel.name ?? "";
  expect(base).toMatch(/^kadoa-email-[a-f0-9]{8}$/);
  const suffix = base.slice(-8);
  channels = [];
  seed("occupied", { recipients: ["other@example.com"] }, "EMAIL", base);
  seed(
    "occupied-suffix",
    { recipients: ["another@example.com"] },
    "EMAIL",
    `${base}-${suffix}`,
  );
  const result = await client.notification.channels.resolveChannel("EMAIL", {
    config: { recipients: ["requested@example.com"] },
  });
  expect(result.channel.config).toEqual({
    recipients: ["requested@example.com"],
  });
  expect(result.channel.name).not.toBe(base);
  expect(result.channel.name).not.toBe(`${base}-${suffix}`);
});

test("all events resolve inventory and the default recipient once per request", async () => {
  const result = await client.notification.configure({
    workflowId: "workflow",
    events: "all",
    channels: { EMAIL: true },
  });
  expect(result.map((s) => s.eventType).sort()).toEqual(
    [
      "workflow_started",
      "workflow_finished",
      "workflow_failed",
      "workflow_sample_finished",
      "workflow_data_change",
      "system_maintenance",
      "service_degradation",
      "credits_low",
      "free_trial_ending",
    ].sort(),
  );
  expect(channels).toHaveLength(1);
  expect(channels[0].config.recipients).toEqual(["owner@example.com"]);
  expect(channelLists).toBe(1);
  expect(userReads).toBe(1);
});

test("multi-recipient setup creates stable distinct names and reuses both destinations", async () => {
  const request = {
    channels: {
      EMAIL: {
        name: "desk",
        recipients: [
          "First@Example.com",
          "second@example.com",
          "first@example.com",
        ],
      },
    },
  };
  const first = await client.notification.setup.setupChannels(request);
  expect(first.map((c) => c.config?.recipients)).toEqual([
    ["first@example.com"],
    ["second@example.com"],
  ]);
  expect(first[0].name).toBe("desk");
  expect(first[1].name).toMatch(/^desk-[a-f0-9]{8}$/);
  const count = writes.length;
  const second = await client.notification.setup.setupChannels(request);
  expect(second.map((c) => c.id)).toEqual(first.map((c) => c.id));
  expect(writes).toHaveLength(count);
});

test("a rejected later event leaves earlier verified edits inspectable and stops the batch", async () => {
  rejectEvent = "workflow_failed";
  await expect(
    client.notification.configure({
      workflowId: "workflow",
      events: ["workflow_started", "workflow_failed", "workflow_finished"],
      channels: { EMAIL: true },
    }),
  ).rejects.toMatchObject({ httpStatus: 409 });
  expect(settings.map((s) => s.eventType)).toEqual(["workflow_started"]);
  expect(settings[0].channels.map((c) => c.config.recipients)).toEqual([
    ["owner@example.com"],
  ]);
});

test("a rejected setting update preserves its original binding", async () => {
  const socket = seed("socket", {}, "WEBSOCKET");
  settings.push({
    id: "alert",
    workflowId: "workflow",
    eventType: "workflow_failed",
    enabled: true,
    channels: [socket],
  });
  rejectEvent = "workflow_failed";
  await expect(
    client.notification.configure({
      workflowId: "workflow",
      events: ["workflow_failed"],
      channels: { EMAIL: true },
    }),
  ).rejects.toMatchObject({ httpStatus: 409 });
  expect(settings[0].channels.map((c) => c.id)).toEqual(["socket"]);
  expect(settings).toHaveLength(1);
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
