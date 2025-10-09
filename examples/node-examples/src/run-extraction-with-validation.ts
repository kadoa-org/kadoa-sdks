import assert from "node:assert";
import { KadoaClient, pollUntil } from "@kadoa/node-sdk";

async function main() {
  const apiKey = process.env.KADOA_API_KEY;
  assert(apiKey, "KADOA_API_KEY is not set");

  const client = new KadoaClient({
    apiKey,
  });

  const result = await client.extraction.run({
    urls: ["https://sandbox.kadoa.com/ecommerce"],
    bypassPreview: false, //skiped by default
  });

  // rule suggestion is asynchronous process so we need to wait for it to complete
  const rulesResult = await pollUntil(
    async () => {
      return await client.validation.listRules({
        workflowId: result.workflowId,
      });
    },
    (result) => result.data.length > 0,
    {
      pollIntervalMs: 1000,
      timeoutMs: 30000,
    },
  );
  const rules = rulesResult.result;
  assert(rules.data.length > 0, "No rules found");
  //approve rules
  const approvedRules = await client.validation.bulkApproveRules({
    workflowId: result.workflowId,
    ruleIds: rules.data.map((rule) => rule.id),
  });
  console.log("approvedRules: ", approvedRules);

  //schedule validation
  const res = await client.validation.scheduleValidation(
    result.workflowId,
    result.workflow?.jobId || "",
  );

  //give Kadoa some time to start validation
  await Promise.resolve(new Promise((resolve) => setTimeout(resolve, 1000)));

  const validation = await client.validation.waitUntilCompleted(
    res.validationId,
  );

  console.log("validation: ", validation);

  //get validation anomalies
  const anomalies = await client.validation.getValidationAnomalies(
    res.validationId,
  );

  console.log("anomalies: ", anomalies);
}

main().catch(console.error);
