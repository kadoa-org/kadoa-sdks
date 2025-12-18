/**
 * TS-NOTIFICATIONS: notifications.mdx snippets
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { KadoaClient } from "../../../src/kadoa-client";
import { getTestEnv } from "../../utils/env";
import { getSharedWorkflowFixture } from "../../utils/shared-fixtures";

describe("TS-NOTIFICATIONS: notifications.mdx snippets", () => {
  let client: KadoaClient;
  let workflowId: string;
  const apiKey = getTestEnv().KADOA_API_KEY;

  beforeAll(async () => {
    client = new KadoaClient({ apiKey });
    const fixture = await getSharedWorkflowFixture(client);
    workflowId = fixture.workflowId;
  }, 120000);

  afterAll(() => {
    client.dispose?.();
  });

  it("TS-NOTIFICATIONS-001: Setup workflow notifications", async () => {
    if (!workflowId) throw new Error("Fixture workflow not created");

    // @docs-start TS-NOTIFICATIONS-001
    // Email notifications
    await client.notification.setupForWorkflow({
      workflowId: workflowId,
      events: ["workflow_finished", "workflow_failed"],
      channels: { EMAIL: true },
    });

    // Custom email recipients
    await client.notification.setupForWorkflow({
      workflowId: workflowId,
      events: ["workflow_finished"],
      channels: {
        EMAIL: {
          name: "team-notifications",
          recipients: ["team@example.com"],
        },
      },
    });

    // Slack notifications
    await client.notification.setupForWorkflow({
      workflowId: workflowId,
      events: ["workflow_failed"],
      channels: {
        SLACK: {
          name: "team-notifications",
          slackChannelId: "C1234567890",
          slackChannelName: "alerts",
          webhookUrl: "https://hooks.slack.com/services/YOUR/WEBHOOK",
        },
      },
    });

    // Webhook notifications
    await client.notification.setupForWorkflow({
      workflowId: workflowId,
      events: ["workflow_finished"],
      channels: {
        WEBHOOK: {
          name: "api-integration",
          webhookUrl: "https://api.example.com/webhooks/kadoa",
          httpMethod: "POST",
        },
      },
    });
    // @docs-end TS-NOTIFICATIONS-001

    expect(true).toBe(true);
  });

  it("TS-NOTIFICATIONS-002: Real-time WebSocket", async () => {
    // @docs-start TS-NOTIFICATIONS-002
    const client = new KadoaClient({ apiKey });
    const realtime = await client.connectRealtime();

    // Subscribe to all events
    realtime.onEvent((event) => {
      console.log("Event received:", event.type, event.message);
    });

    // Filter events by type
    realtime.onEvent((event) => {
      if (event.type === "workflow_finished") {
        console.log("Workflow completed:", event.message);
      }
    });

    // Handle errors
    realtime.onError((error) => {
      console.error("WebSocket error:", error);
    });
    // @docs-end TS-NOTIFICATIONS-002

    expect(client.realtime).toBeDefined();

    const unsubscribe = realtime.onEvent(() => {});
    expect(typeof unsubscribe).toBe("function");
    unsubscribe();

    realtime.close();
  });

  it("TS-NOTIFICATIONS-003: Channel management", async () => {
    // @docs-start TS-NOTIFICATIONS-003
    // List channels
    const channels = await client.notification.channels.listChannels({});

    console.log("Channels:", channels);
    // @docs-end TS-NOTIFICATIONS-003

    expect(channels).toBeDefined();
  });
});
