import type { Command } from "commander";
import { fetchOpenAPISpec } from "../lib/spec";

export function registerFetch(program: Command): void {
  program
    .command("fetch-spec")
    .description("Fetch the latest OpenAPI spec")
    .option("-f, --force", "Force fetch even if cache is valid")
    .requiredOption("-e, --endpoint <url>", "Custom OpenAPI endpoint URL")
    .action(async (opts: { force?: boolean; endpoint: string }) => {
      try {
        await fetchOpenAPISpec({
          force: Boolean(opts.force),
          endpoint: opts.endpoint,
        });
      } catch (error) {
        console.error(String(error));
        process.exit(1);
      }
    });
}
