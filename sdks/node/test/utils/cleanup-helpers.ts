import type { KadoaClient } from "../../src";

export const deleteWorkflowByName = async (
  name: string,
  client: KadoaClient,
): Promise<void> => {
  const workflow = await client.workflow.getByName(name);
  if (workflow?.id) await client.workflow.delete(workflow.id);
};

export const deleteSchemaByName = async (
  name: string,
  client: KadoaClient,
): Promise<void> => {
  const schemas = await client.schema.listSchemas();
  const existing = schemas.find((s) => s.name === name);
  if (existing?.id) await client.schema.deleteSchema(existing.id);
};

export const deleteChannelByName = async (
  name: string,
  client: KadoaClient,
): Promise<void> => {
  const channels = await client.notification.channels.listChannels({});
  const existing = channels.find((c) => c.name === name);
  if (existing?.id) await client.notification.channels.deleteChannel(existing.id);
};
