import assert from "node:assert";
import { KadoaClient } from "@kadoa/node-sdk";

// Configuration
const BURST_SIZE = 10; // Number of concurrent requests per burst
const NUM_BURSTS = 5; // Number of bursts to send
const DELAY_BETWEEN_BURSTS_MS = 1000; // Delay between bursts in milliseconds

async function main() {
  const apiKey = process.env.KADOA_API_KEY;
  assert(apiKey, "KADOA_API_KEY is not set");

  const client = new KadoaClient({
    apiKey,
  });

  const stats = {
    total: 0,
    success: 0,
    failed: 0,
    startTime: Date.now(),
  };

  console.log(
    `Starting stress test: ${NUM_BURSTS} bursts × ${BURST_SIZE} requests`,
  );
  console.log("================================");

  for (let burstNum = 1; burstNum <= NUM_BURSTS; burstNum++) {
    console.log(
      `\nBurst ${burstNum}/${NUM_BURSTS} - Sending ${BURST_SIZE} concurrent requests...`,
    );

    const burstStartTime = Date.now();

    // Send burst of concurrent requests
    const promises = Array.from({ length: BURST_SIZE }, async (_, i) => {
      stats.total++;
      try {
        const result = await client.extraction.run({
          urls: ["https://sandbox.kadoa.com/careers"],
          name: `test-extraction-${burstNum}-${i}`,
          navigationMode: "page-and-detail",
        });
        stats.success++;
        return {
          success: true,
          requestNum: i + 1,
          workflowId: result.workflowId,
        };
      } catch (error) {
        stats.failed++;
        return {
          success: false,
          requestNum: i + 1,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    const results = await Promise.allSettled(promises);
    const burstDuration = Date.now() - burstStartTime;

    // Log burst results
    const burstSuccess = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;
    const burstFailed = results.filter(
      (r) =>
        r.status === "rejected" ||
        (r.status === "fulfilled" && !r.value.success),
    ).length;

    console.log(`Burst ${burstNum} completed in ${burstDuration}ms`);
    console.log(`  ✓ Success: ${burstSuccess}`);
    console.log(`  ✗ Failed: ${burstFailed}`);

    // Delay before next burst (except for the last one)
    if (burstNum < NUM_BURSTS) {
      await new Promise((resolve) =>
        setTimeout(resolve, DELAY_BETWEEN_BURSTS_MS),
      );
    }
  }

  const totalDuration = Date.now() - stats.startTime;

  console.log("\n================================");
  console.log("Stress Test Complete");
  console.log("================================");
  console.log(`Total requests: ${stats.total}`);
  console.log(
    `Successful: ${stats.success} (${((stats.success / stats.total) * 100).toFixed(2)}%)`,
  );
  console.log(
    `Failed: ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(2)}%)`,
  );
  console.log(`Total duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(
    `Avg throughput: ${(stats.total / (totalDuration / 1000)).toFixed(2)} req/s`,
  );
}

main().catch(console.error);
