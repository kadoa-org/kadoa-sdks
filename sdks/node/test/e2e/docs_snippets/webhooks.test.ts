/**
 * TS-WEBHOOKS: data-delivery/webhooks.mdx snippets
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { KadoaClient } from "../../../src/kadoa-client";
import { deleteChannelByName } from "../../utils/cleanup-helpers";
import { getTestEnv } from "../../utils/env";
import { getSharedWorkflowFixture } from "../../utils/shared-fixtures";

describe("TS-WEBHOOKS: data-delivery/webhooks.mdx snippets", () => {
  let client: KadoaClient;
  let sharedWorkflowId: string;

  beforeAll(async () => {
    client = new KadoaClient({ apiKey: getTestEnv().KADOA_API_KEY });
    const fixture = await getSharedWorkflowFixture(client);
    sharedWorkflowId = fixture.workflowId;
  }, 120000);

  afterAll(() => {
    client.dispose?.();
  });

  it("TS-WEBHOOKS-001: Quick webhook setup", async () => {
    if (!sharedWorkflowId) throw new Error("Fixture workflow not created");
    const channelName = "api-integration";
    await deleteChannelByName(channelName, client);

    // @docs-start TS-WEBHOOKS-001
    await client.notification.setupForWorkflow({
      workflowId: sharedWorkflowId,
      events: ["workflow_data_change"],
      channels: {
        WEBHOOK: {
          name: "api-integration",
          webhookUrl: "https://api.example.com/webhooks/kadoa",
          httpMethod: "POST",
        },
      },
    });
    // @docs-end TS-WEBHOOKS-001

    expect(true).toBe(true);

    // Cleanup
    await deleteChannelByName(channelName, client);
  });

  it("TS-WEBHOOKS-002: Channel management", async () => {
    const channelName = "my-webhook";
    await deleteChannelByName(channelName, client);

    // @docs-start TS-WEBHOOKS-002
    // Create webhook channel
    const channel = await client.notification.channels.createChannel(
      "WEBHOOK",
      {
        name: "my-webhook",
        config: {
          webhookUrl: "https://sandbox.kadoa.com/api/webhooks/kadoa",
          httpMethod: "POST",
        },
      },
    );

    // List all channels
    const channels = await client.notification.channels.listChannels({});

    console.log("Created channel:", channel);
    console.log("All channels:", channels);
    // @docs-end TS-WEBHOOKS-002

    expect(channel).toBeDefined();
    expect(channels).toBeDefined();

    // Cleanup
    if (channel.id)
      await client.notification.channels.deleteChannel(channel.id);
  });
});
