import { watch } from "node:fs";
import { resolve } from "node:path";
import type { Command } from "commander";
import {
  checkOrphanTags,
  checkUntaggedBlocks,
  checkUnusedTags,
  syncSnippets,
} from "../lib/sync-docs";

const DEFAULT_SOURCE_GLOBS = [
  "**/*docs?snippets*",
  "**/docs_snippets/*.py",
  "**/docs_snippets/*.ts",
];

export function registerSyncDocs(program: Command): void {
  program
    .command("sync-docs")
    .description("Sync code snippets from SDK tests to MDX documentation")
    .option("-s, --source <dir>", "Source directory", "./sdks")
    .option(
      "-t, --target <dir>",
      "Target docs directory",
      process.env.DOCS_PATH,
    )
    .option("--dry-run", "Preview changes without writing")
    .option("--check", "Find orphan tags (tags in docs without test snippets)")
    .option(
      "--unused",
      "Find unused tags (tags in tests without doc references)",
    )
    .option(
      "--untagged",
      "Find untagged code blocks (typescript/python blocks without sync tags)",
    )
    .option("-w, --watch", "Watch source files and sync on changes")
    .action(
      async (opts: {
        source: string;
        target?: string;
        dryRun?: boolean;
        check?: boolean;
        unused?: boolean;
        untagged?: boolean;
        watch?: boolean;
      }) => {
        if (!opts.target) {
          console.error(
            "Error: --target is required (or set DOCS_PATH env var)",
          );
          process.exit(1);
        }

        const config = {
          sourceDir: resolve(opts.source),
          targetDir: resolve(opts.target),
          sourceGlobs: DEFAULT_SOURCE_GLOBS,
          targetGlob: "**/*.mdx",
          dryRun: Boolean(opts.dryRun),
        };

        try {
          if (opts.check) {
            runCheck(config);
          } else if (opts.unused) {
            runUnused(config);
          } else if (opts.untagged) {
            runUntagged(config.targetDir, config.targetGlob);
          } else if (opts.watch) {
            runWatch(config);
          } else {
            runSync(config);
          }
        } catch (error) {
          console.error(String(error));
          process.exit(1);
        }
      },
    );
}

function runCheck(config: {
  sourceDir: string;
  targetDir: string;
  sourceGlobs: string[];
  targetGlob: string;
}) {
  console.log(
    "Checking for orphan tags (tags in docs without test snippets)\n",
  );

  const result = checkOrphanTags(config);

  console.log(`Source tags: ${result.sourceTags}`);
  console.log(`Doc tags: ${result.docTags}\n`);

  if (result.orphans.length === 0) {
    console.log(
      "No orphan tags found. All doc tags have corresponding test snippets.",
    );
    return;
  }

  console.log(`Orphan tags (${result.orphans.length}):\n`);
  const byFile = new Map<string, string[]>();
  for (const o of result.orphans) {
    if (!byFile.has(o.file)) byFile.set(o.file, []);
    byFile.get(o.file)?.push(o.tag);
  }

  for (const [file, tags] of byFile) {
    console.log(`  ${file}: ${tags.join(", ")}`);
  }

  process.exit(1);
}

function runUnused(config: {
  sourceDir: string;
  targetDir: string;
  sourceGlobs: string[];
  targetGlob: string;
}) {
  console.log(
    "Checking for unused tags (tags in tests without doc references)\n",
  );

  const result = checkUnusedTags(config);

  console.log(`Source tags: ${result.sourceTags}`);
  console.log(`Doc tags: ${result.docTags}\n`);

  if (result.unused.length === 0) {
    console.log(
      "No unused tags found. All test snippets are referenced in docs.",
    );
    return;
  }

  console.log(`Unused tags (${result.unused.length}):\n`);
  const byFile = new Map<string, string[]>();
  for (const u of result.unused) {
    if (!byFile.has(u.file)) byFile.set(u.file, []);
    byFile.get(u.file)?.push(u.tag);
  }

  for (const [file, tags] of byFile) {
    console.log(`  ${file}: ${tags.join(", ")}`);
  }

  process.exit(1);
}

function runSync(config: {
  sourceDir: string;
  targetDir: string;
  sourceGlobs: string[];
  targetGlob: string;
  dryRun: boolean;
}) {
  console.log("Syncing documentation snippets\n");
  if (config.dryRun) console.log("[DRY RUN]\n");

  const stats = syncSnippets(config);

  console.log(`Source: ${config.sourceDir}`);
  console.log(`Found ${stats.sourceFiles} source file(s)`);
  console.log(`Total: ${stats.snippets} unique snippet(s)`);
  if (stats.preambles > 0) {
    console.log(`       ${stats.preambles} preamble(s) merged`);
  }
  console.log();

  console.log(`Target: ${config.targetDir}`);
  console.log(`Found ${stats.targetFiles} target file(s)\n`);

  for (const r of stats.results) {
    console.log(`${r.file}: ${r.updated.join(", ")}`);
  }

  console.log(
    `\nUpdated ${stats.updatedSnippets} snippet(s) in ${stats.updatedFiles} file(s)`,
  );
  if (config.dryRun) console.log("(dry run - no files written)");
}

const DEFAULT_EXCLUDE_PATTERNS = [
  "**/changelog/**",
  "**/changelogs/**",
  "**/node_modules/**",
];

function runUntagged(targetDir: string, targetGlob: string) {
  console.log(
    "Checking for untagged code blocks (typescript/python without sync tags)\n",
  );

  const result = checkUntaggedBlocks({
    targetDir,
    targetGlob,
    excludePatterns: DEFAULT_EXCLUDE_PATTERNS,
  });

  console.log(`Total blocks: ${result.totalBlocks}`);
  console.log(`Tagged blocks: ${result.taggedBlocks}`);
  console.log(`Untagged blocks: ${result.untagged.length}\n`);

  if (result.untagged.length === 0) {
    console.log("No untagged blocks found. All code blocks have sync tags.");
    return;
  }

  console.log(`Untagged blocks (${result.untagged.length}):\n`);
  for (const block of result.untagged) {
    console.log(`  ${block.file}:${block.line} [${block.lang}]`);
    if (block.preview) {
      console.log(`    → ${block.preview}`);
    }
  }

  process.exit(1);
}

const WATCH_DIRS = [
  "sdks/node/test/e2e/docs_snippets",
  "sdks/python/tests/e2e/docs_snippets",
];

function runWatch(config: {
  sourceDir: string;
  targetDir: string;
  sourceGlobs: string[];
  targetGlob: string;
  dryRun: boolean;
}) {
  console.log("Watch mode: syncing on file changes\n");

  // Initial sync
  runSyncQuiet(config);

  // Debounce to avoid multiple syncs
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounceMs = 100;

  const triggerSync = (file: string) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      console.log(`\n[${new Date().toLocaleTimeString()}] Change: ${file}`);
      runSyncQuiet(config);
    }, debounceMs);
  };

  // Watch each directory (relative to cwd, not sourceDir)
  for (const dir of WATCH_DIRS) {
    const fullPath = resolve(dir);
    try {
      watch(fullPath, { recursive: true }, (_event, filename) => {
        if (filename && (filename.endsWith(".ts") || filename.endsWith(".py"))) {
          triggerSync(filename);
        }
      });
      console.log(`Watching: ${fullPath}`);
    } catch {
      console.warn(`Warning: could not watch ${fullPath}`);
    }
  }

  console.log("\nPress Ctrl+C to stop\n");
}

function runSyncQuiet(config: {
  sourceDir: string;
  targetDir: string;
  sourceGlobs: string[];
  targetGlob: string;
  dryRun: boolean;
}) {
  const stats = syncSnippets(config);
  if (stats.updatedSnippets > 0) {
    console.log(
      `Synced ${stats.updatedSnippets} snippet(s) in ${stats.updatedFiles} file(s)`,
    );
  } else {
    console.log("No changes");
  }
}
