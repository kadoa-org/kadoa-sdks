import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { getE2ETestEnv } from "../utils/env";

import { NotificationChannelType } from "../../src/internal/domains/notifications/notification-channels.service";
import { KadoaClient } from "../../src/kadoa-client";
import { seedWorkflow } from "../utils/seeder";

describe("Notifications", () => {
	let client: KadoaClient;
	const env = getE2ETestEnv();
	let workflowId: string;

	beforeAll(async () => {
		client = new KadoaClient({
			apiKey: env.KADOA_TEAM_API_KEY,
			timeout: 30000,
		});

		workflowId = await seedWorkflow({ name: "test-workflow-1" }, client);
	});

	beforeAll(async () => {
		await cleanupTestData();
	});

	afterAll(() => {
		if (client) {
			client.dispose();
		}
	});

	async function cleanupTestData() {
		const settings = await client.notification.settings.listSettings({});
		for (const setting of settings) {
			if (setting.id) {
				await client.notification.settings.deleteSettings(setting.id);
			}
		}

		const channels = await client.notification.channels.listAllChannels();
		for (const channel of channels) {
			if (channel.id) {
				await client.notification.channels.deleteChannel(channel.id);
			}
		}
	}

	test(
		"should setup notifications for workspace",
		async () => {
			const result = await client.notification.setupForWorkspace({
				events: "all",
				channels: {
					EMAIL: true,
					WEBSOCKET: true,
				},
			});

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThan(0);
			expect(result[0].workflowId).toBeNull();
			expect(result[0].channels?.length).toBe(2);
			expect(result[0].enabled).toBe(true);
			expect(
				result[0].channels?.some(
					(channel) => channel.channelType === NotificationChannelType.EMAIL,
				),
			).toBe(true);
			expect(
				result[0].channels?.some(
					(channel) =>
						channel.channelType === NotificationChannelType.WEBSOCKET,
				),
			).toBe(true);
		},
		{ timeout: 60000 },
	);

	test(
		"should setup notifications for specific workflow",
		async () => {
			const result = await client.notification.setupForWorkflow({
				workflowId,
				events: ["workflow_finished", "workflow_failed"],
				channels: {
					WEBSOCKET: true,
					EMAIL: true,
				},
			});

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThan(0);
			expect(result[0].workflowId).toBe(workflowId);
			expect(result[0].channels?.length).toBe(2);
			expect(
				result.some((setting) => setting.eventType === "workflow_finished"),
			).toBe(true);
			expect(
				result.some((setting) => setting.eventType === "workflow_failed"),
			).toBe(true);
			expect(
				result[0].channels?.some(
					(channel) =>
						channel.channelType === NotificationChannelType.WEBSOCKET,
				),
			).toBe(true);
			expect(
				result[0].channels?.some(
					(channel) => channel.channelType === NotificationChannelType.EMAIL,
				),
			).toBe(true);
			expect(result[0].enabled).toBe(true);
		},
		{ timeout: 60000 },
	);
});
