import assert from "node:assert";
import { KadoaClient } from "@kadoa/node-sdk";

function _sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const apiKey = process.env.KADOA_API_KEY;
  assert(apiKey, "KADOA_API_KEY is not set");

  const client = new KadoaClient({
    apiKey,
  });

  // const createdWorkflows = await Promise.allSettled(
  // 	Array.from({ length: 25 }, async (_, i) => {
  // 		const result = await client.extraction.run({
  // 			urls: ["https://sandbox.kadoa.com/ecommerce"],
  // 			name: `test-extraction-with-notifications${i}`,
  // 			navigationMode: "paginated-page",
  // 			bypassPreview: false,
  // 		});
  // 		const rulesResult = await pollUntil(
  // 			async () => {
  // 				return await client.validation.listRules({
  // 					workflowId: result.workflowId,
  // 				});
  // 			},
  // 			(result) => result.data.length > 0,
  // 			{
  // 				pollIntervalMs: 1000,
  // 				timeoutMs: 30000,
  // 			},
  // 		);
  // 		const approvedRules = await client.validation.bulkApproveRules({
  // 			workflowId: result.workflowId,
  // 			ruleIds: rulesResult.result.data.map((rule) => rule.id),
  // 		});
  // 		console.log("approvedRules: ", approvedRules.approvedCount);
  // 		return result;
  // 	}),
  // );

  // const workflows = createdWorkflows
  // 	.filter((workflow) => workflow.status === "fulfilled")
  // 	.map((workflow) => workflow.value.workflow)
  // 	.filter((workflow) => workflow !== undefined);

  // console.log("Waiting for 60 seconds...");
  // await sleep(60000);
  // console.log("60 seconds passed");

  const workflows = await client.workflow
    .list({
      limit: 25,
    })
    .then((workflows) =>
      workflows.filter((workflow) => workflow.jobId && workflow._id),
    );

  if (workflows.length === 0) {
    console.log("No workflows found");
    client.dispose();
    return;
  }

  console.log(`Found ${workflows.length} workflows, using them for testing`);

  const iterations = 3;
  const durations: number[] = [];
  let successCount = 0;
  let errorCount = 0;

  console.log(`Starting ${iterations} requests...\n`);

  for (let i = 0; i < iterations; i += 1) {
    const promises = workflows.map(async (workflow) => {
      const startTime = performance.now();

      await client.validation.listRules({
        workflowId: workflow._id,
      });
      await client.validation.scheduleValidation(workflow._id, workflow.jobId);
      await client.validation
        .getLatestValidation(workflow._id, workflow.jobId)
        .then((validation) => {
          if (validation) {
            return client.validation.getValidationDetails(validation.id);
          }
        });
      const endTime = performance.now();
      const duration = endTime - startTime;
      return { duration };
    });

    const results = await Promise.allSettled(promises);

    for (const result of results) {
      if (result.status === "fulfilled") {
        durations.push(result.value.duration);
        successCount++;
      } else {
        errorCount++;
        console.error(`Request failed:`, result.reason);
      }
    }

    const currentFailRatio = errorCount / (successCount + errorCount);
    if (i % 100 === 0 || i + 1 >= iterations) {
      console.log(
        `Progress: ${i + 1}/${iterations} | Fail ratio: ${(currentFailRatio * 100).toFixed(2)}%`,
      );
    }
  }

  // Calculate statistics
  const avgDuration =
    durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const sortedDurations = [...durations].sort((a, b) => a - b);
  const medianDuration =
    sortedDurations[Math.floor(sortedDurations.length / 2)];

  const failRatio = errorCount / iterations;

  console.log("\n=== Results ===");
  console.log(`Total requests: ${iterations}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log(`Fail ratio: ${(failRatio * 100).toFixed(2)}%`);
  console.log(`\nDuration Statistics (ms):`);
  console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
  console.log(`  Median:  ${medianDuration.toFixed(2)}ms`);
  console.log(`  Min:     ${minDuration.toFixed(2)}ms`);
  console.log(`  Max:     ${maxDuration.toFixed(2)}ms`);

  client.dispose();
}

main().catch(console.error);
