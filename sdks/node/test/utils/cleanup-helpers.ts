import type { KadoaClient } from "../../src";

export const deleteWorkflowByName = async (
  name: string,
  client: KadoaClient,
): Promise<void> => {
  try {
    const workflow = await client.workflow.getByName(name);
    console.log(`[Cleanup] Looking for workflow: "${name}"`);
    if (workflow?.id) {
      console.log(`[Cleanup] Deleting workflow: ${workflow.id}`);
      await client.workflow.delete(workflow.id);
      console.log(`[Cleanup] Workflow deleted`);
    } else {
      console.log(`[Cleanup] Workflow "${name}" not found`);
    }
  } catch (error) {
    console.error(`[Cleanup] Failed to delete workflow "${name}":`, error);
  }
};

export const deleteSchemaByName = async (
  name: string,
  client: KadoaClient,
): Promise<void> => {
  try {
    const schemas = await client.schema.listSchemas();
    console.log(`[Cleanup] Found ${schemas.length} schemas, looking for: "${name}"`);
    const existing = schemas.find((s) => s.name === name);
    if (existing?.id) {
      console.log(`[Cleanup] Deleting schema: ${existing.id}`);
      await client.schema.deleteSchema(existing.id);
      console.log(`[Cleanup] Schema deleted`);
    } else {
      console.log(`[Cleanup] Schema "${name}" not found`);
    }
  } catch (error) {
    console.error(`[Cleanup] Failed to delete schema "${name}":`, error);
  }
};

export const deleteChannelByName = async (
  name: string,
  client: KadoaClient,
): Promise<void> => {
  try {
    const channels = await client.notification.channels.listChannels({});
    console.log(`[Cleanup] Found ${channels.length} channels, looking for: "${name}"`);
    const existing = channels.find((c) => c.name === name);
    if (existing?.id) {
      console.log(`[Cleanup] Deleting channel: ${existing.id}`);
      await client.notification.channels.deleteChannel(existing.id);
      console.log(`[Cleanup] Channel deleted`);
    } else {
      console.log(`[Cleanup] Channel "${name}" not found`);
    }
  } catch (error) {
    console.error(`[Cleanup] Failed to delete channel "${name}":`, error);
  }
};

export const deletePreviewRules = async (
  workflowId: string,
  client: KadoaClient,
): Promise<void> => {
  try {
    const rules = await client.validation.rules.listRules({
      workflowId,
      status: "preview",
    });
    const ruleIds = rules.data?.map((r) => r.id).filter(Boolean) as string[];
    if (ruleIds.length > 0) {
      console.log(`[Cleanup] Deleting ${ruleIds.length} preview rules`);
      await client.validation.rules.bulkDeleteRules({ workflowId, ruleIds });
    }
  } catch (error) {
    console.error("[Cleanup] Failed to delete preview rules:", error);
  }
};
