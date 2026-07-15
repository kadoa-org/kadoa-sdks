import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { verifySnippets } from "./sync-docs";

const REPOSITORY_ROOT = resolve(import.meta.dir, "../../../..");
const CLI_ENTRY = join(REPOSITORY_ROOT, "tools/codegen/src/cli.ts");
const temporaryDirectories: string[] = [];

interface Fixture {
  root: string;
  sourceDir: string;
  targetDir: string;
  sourceFile: string;
  targetFile: string;
}

function writeFixtureFile(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function createFixture(source: string, target: string): Fixture {
  const root = mkdtempSync(join(tmpdir(), "sync-docs-"));
  temporaryDirectories.push(root);

  const sourceDir = join(root, "source");
  const targetDir = join(root, "target");
  const sourceFile = join(
    sourceDir,
    "node/test/e2e/docs_snippets/example.test.ts",
  );
  const targetFile = join(targetDir, "guide.mdx");

  writeFixtureFile(sourceFile, source);
  writeFixtureFile(targetFile, target);

  return { root, sourceDir, targetDir, sourceFile, targetFile };
}

function config(fixture: Fixture) {
  return {
    sourceDir: fixture.sourceDir,
    targetDir: fixture.targetDir,
    sourceGlobs: ["**/*.ts"],
    targetGlob: "**/*.mdx",
  };
}

async function runCli(fixture: Fixture): Promise<{
  exitCode: number;
  output: string;
}> {
  const childProcess = Bun.spawn(
    [
      process.execPath,
      CLI_ENTRY,
      "sync-docs",
      "--source",
      fixture.sourceDir,
      "--target",
      fixture.targetDir,
      "--verify",
    ],
    {
      cwd: REPOSITORY_ROOT,
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [exitCode, stdout, stderr] = await Promise.all([
    childProcess.exited,
    new Response(childProcess.stdout).text(),
    new Response(childProcess.stderr).text(),
  ]);
  return { exitCode, output: `${stdout}${stderr}` };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("verifySnippets", () => {
  test("accepts byte-exact rendered content", () => {
    const fixture = createFixture(
      `// @docs-start TS-EXAMPLE-001
console.log("current");
// @docs-end TS-EXAMPLE-001
`,
      `{/* TS-EXAMPLE-001 */}
\`\`\`typescript
console.log("current");
\`\`\`
`,
    );

    expect(verifySnippets(config(fixture))).toEqual({
      drifted: [],
      missingSources: [],
    });
  });

  test("reports stale content with its relative file and tag", () => {
    const fixture = createFixture(
      `// @docs-start TS-EXAMPLE-001
console.log("current");
// @docs-end TS-EXAMPLE-001
`,
      `{/* TS-EXAMPLE-001 */}
\`\`\`typescript
console.log("stale");
\`\`\`
`,
    );

    expect(verifySnippets(config(fixture))).toEqual({
      drifted: [{ file: "guide.mdx", tags: ["TS-EXAMPLE-001"] }],
      missingSources: [],
    });
  });

  test("reports only stale tags in a mixed file", () => {
    const fixture = createFixture(
      `// @docs-start TS-EXAMPLE-001
console.log("current");
// @docs-end TS-EXAMPLE-001

// @docs-start TS-EXAMPLE-002
console.log("second");
// @docs-end TS-EXAMPLE-002
`,
      `{/* TS-EXAMPLE-001 */}
\`\`\`typescript
console.log("current");
\`\`\`

{/* TS-EXAMPLE-002 */}
\`\`\`typescript
console.log("stale");
\`\`\`
`,
    );

    expect(verifySnippets(config(fixture))).toEqual({
      drifted: [{ file: "guide.mdx", tags: ["TS-EXAMPLE-002"] }],
      missingSources: [],
    });
  });

  test("uses the sync preamble rendering rules", () => {
    const fixture = createFixture(
      `// @docs-preamble TS-EXAMPLE-001
// import { current } from "example";
// @docs-preamble-end TS-EXAMPLE-001
// @docs-start TS-EXAMPLE-001
console.log(current);
// @docs-end TS-EXAMPLE-001
`,
      `{/* TS-EXAMPLE-001 */}
\`\`\`typescript
import { stale } from "example";

console.log(current);
\`\`\`
`,
    );

    expect(verifySnippets(config(fixture))).toEqual({
      drifted: [{ file: "guide.mdx", tags: ["TS-EXAMPLE-001"] }],
      missingSources: [],
    });
  });

  test("reports missing sources separately from content drift", () => {
    const fixture = createFixture(
      "",
      `{/* TS-MISSING-001 */}
\`\`\`typescript
console.log("documented only");
\`\`\`
`,
    );

    expect(verifySnippets(config(fixture))).toEqual({
      drifted: [],
      missingSources: [{ file: "guide.mdx", tag: "TS-MISSING-001" }],
    });
  });

  test("does not change target bytes or mtime", () => {
    const fixture = createFixture(
      `// @docs-start TS-EXAMPLE-001
console.log("current");
// @docs-end TS-EXAMPLE-001
`,
      `{/* TS-EXAMPLE-001 */}
\`\`\`typescript
console.log("stale");
\`\`\`
`,
    );
    const beforeContent = readFileSync(fixture.targetFile, "utf-8");
    const beforeMtime = statSync(fixture.targetFile).mtimeMs;

    verifySnippets(config(fixture));

    expect(readFileSync(fixture.targetFile, "utf-8")).toBe(beforeContent);
    expect(statSync(fixture.targetFile).mtimeMs).toBe(beforeMtime);
  });
});

describe("sync-docs --verify", () => {
  test("exits zero for matching content", async () => {
    const fixture = createFixture(
      `// @docs-start TS-EXAMPLE-001
console.log("current");
// @docs-end TS-EXAMPLE-001
`,
      `{/* TS-EXAMPLE-001 */}
\`\`\`typescript
console.log("current");
\`\`\`
`,
    );

    const result = await runCli(fixture);

    expect(result.exitCode).toBe(0);
  });

  test("exits one for stale content and does not write", async () => {
    const fixture = createFixture(
      `// @docs-start TS-EXAMPLE-001
console.log("current");
// @docs-end TS-EXAMPLE-001
`,
      `{/* TS-EXAMPLE-001 */}
\`\`\`typescript
console.log("stale");
\`\`\`
`,
    );
    const beforeContent = readFileSync(fixture.targetFile, "utf-8");

    const result = await runCli(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("guide.mdx");
    expect(result.output).toContain("TS-EXAMPLE-001");
    expect(readFileSync(fixture.targetFile, "utf-8")).toBe(beforeContent);
  });

  test("exits one for missing sources and does not write", async () => {
    const fixture = createFixture(
      "",
      `{/* TS-MISSING-001 */}
\`\`\`typescript
console.log("documented only");
\`\`\`
`,
    );
    const beforeContent = readFileSync(fixture.targetFile, "utf-8");

    const result = await runCli(fixture);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("guide.mdx");
    expect(result.output).toContain("TS-MISSING-001");
    expect(readFileSync(fixture.targetFile, "utf-8")).toBe(beforeContent);
  });
});
