#!/usr/bin/env bun
import { program } from "commander";
import { registerFetch } from "./commands/fetch";
import { registerGenerate } from "./commands/generate";
import { registerSyncDocs } from "./commands/sync-docs";

program
  .name("kadoa-codegen")
  .description("Kadoa SDK Code Generator CLI")
  .version("0.0.1");

registerFetch(program);
registerGenerate(program);
registerSyncDocs(program);

if (process.argv.length <= 2) {
  program.help({ error: false });
}

program.parse(process.argv);
