/**
 * Syncs documentation snippets from source files to MDX docs.
 *
 * Extracts code between @docs-start/@docs-end markers and replaces
 * corresponding code blocks in MDX files marked with TAG comments.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import { Glob } from "bun";

// Types

interface TaggedCode {
  tag: string;
  code: string;
  source: string;
}

export interface SyncResult {
  file: string;
  updated: string[];
  skipped: string[];
}

export interface SyncConfig {
  sourceDir: string;
  targetDir: string;
  sourceGlobs: string[];
  targetGlob: string;
  dryRun: boolean;
}

export interface SyncStats {
  sourceFiles: number;
  snippets: number;
  preambles: number;
  targetFiles: number;
  updatedSnippets: number;
  updatedFiles: number;
  results: SyncResult[];
}

export interface OrphanTag {
  tag: string;
  file: string;
}

export interface CheckResult {
  sourceTags: number;
  docTags: number;
  orphans: OrphanTag[];
}

export interface UnusedTag {
  tag: string;
  file: string;
}

export interface UnusedResult {
  sourceTags: number;
  docTags: number;
  unused: UnusedTag[];
}

export interface UntaggedBlock {
  file: string;
  line: number;
  lang: string;
  preview: string;
}

export interface UntaggedResult {
  totalBlocks: number;
  taggedBlocks: number;
  untagged: UntaggedBlock[];
}

// File discovery

function findFiles(dir: string, pattern: string): string[] {
  return [...new Glob(pattern).scanSync({ cwd: dir, absolute: true })].sort();
}

function findFilesMulti(dir: string, patterns: string[]): string[] {
  const files = new Set<string>();
  for (const pattern of patterns) {
    for (const file of findFiles(dir, pattern)) {
      files.add(file);
    }
  }
  return [...files].sort();
}

// Extraction

function dedent(code: string): string {
  const trimmed = code.replace(/^\n+/, "").replace(/\n+$/, "");
  const lines = trimmed.split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);

  if (nonEmpty.length === 0) return trimmed;

  const minIndent = Math.min(
    ...nonEmpty.map((line) => line.match(/^(\s*)/)?.[1].length ?? 0),
  );

  return minIndent > 0
    ? lines.map((line) => line.slice(minIndent)).join("\n")
    : trimmed;
}

function extractSnippets(content: string, source: string): TaggedCode[] {
  const snippets: TaggedCode[] = [];

  const patterns = [
    // Line comments: // @docs-start TAG ... // @docs-end TAG
    /\/\/\s*@docs-start\s+([\w-]+)\s*\n([\s\S]*?)\/\/\s*@docs-end\s+\1/g,
    // Block comments: /* @docs-start TAG ... @docs-end TAG */
    /\/\*\s*@docs-start\s+([\w-]+)\s*\n([\s\S]*?)@docs-end\s+\1\s*\*\//g,
    // Python comments: # @docs-start TAG ... # @docs-end TAG
    /#\s*@docs-start\s+([\w-]+)\s*\n([\s\S]*?)#\s*@docs-end\s+\1/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      snippets.push({
        tag: match[1],
        code: dedent(match[2]),
        source,
      });
    }
  }

  return snippets;
}

/**
 * Extract preambles - doc-only code that gets prepended to snippets.
 * Preambles are written as comments with stripped prefixes.
 */
function extractPreambles(content: string, source: string): TaggedCode[] {
  const preambles: TaggedCode[] = [];

  const patterns = [
    // Line comments (TS/JS): // @docs-preamble TAG ... // @docs-preamble-end TAG
    /\/\/\s*@docs-preamble\s+([\w-]+)\s*\n([\s\S]*?)\/\/\s*@docs-preamble-end\s+\1/g,
    // Python: # @docs-preamble TAG ... # @docs-preamble-end TAG
    /#\s*@docs-preamble\s+([\w-]+)\s*\n([\s\S]*?)#\s*@docs-preamble-end\s+\1/g,
  ];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      // Strip comment prefix from each line (// or #)
      const strippedCode = match[2]
        .split("\n")
        .map((line) => line.replace(/^(\s*)(?:\/\/|#)\s?/, "$1"))
        .join("\n");

      preambles.push({
        tag: match[1],
        code: dedent(strippedCode),
        source,
      });
    }
  }

  return preambles;
}

// Replacement

function replaceSnippets(
  content: string,
  snippets: Map<string, string>,
): { content: string; updated: string[]; skipped: string[] } {
  const updated: string[] = [];
  const skipped: string[] = [];

  // Pattern: {/* TAG */} followed by ```typescript or ```python ... ```
  // Handles optional indentation before tag and code block
  const tagPattern =
    /([ \t]*\{\/\*\s*([\w-]+)\s*\*\/\}\s*\n)([ \t]*```(?:typescript|python)[^\n]*\n)([\s\S]*?)([ \t]*```)/g;

  const newContent = content.replace(
    tagPattern,
    (match, tagLine, tag, langLine, _oldCode, closing) => {
      const newCode = snippets.get(tag);
      if (newCode != null) {
        updated.push(tag);
        return `${tagLine}${langLine}${newCode}\n${closing}`;
      }
      skipped.push(tag);
      return match;
    },
  );

  return { content: newContent, updated, skipped };
}

function findDocTags(content: string): string[] {
  const pattern =
    /[ \t]*\{\/\*\s*([\w-]+)\s*\*\/\}\s*\n[ \t]*```(?:typescript|python)/g;
  return [...content.matchAll(pattern)].map((m) => m[1]);
}

// Main operations

export function checkOrphanTags(config: Omit<SyncConfig, "dryRun">): CheckResult {
  const sourceFiles = findFilesMulti(config.sourceDir, config.sourceGlobs);
  const sourceTags = new Set<string>();

  for (const file of sourceFiles) {
    const content = readFileSync(file, "utf-8");
    for (const s of extractSnippets(content, file)) {
      sourceTags.add(s.tag);
    }
  }

  const targetFiles = findFiles(config.targetDir, config.targetGlob);
  const docTags: OrphanTag[] = [];

  for (const file of targetFiles) {
    const content = readFileSync(file, "utf-8");
    for (const tag of findDocTags(content)) {
      docTags.push({ tag, file: relative(config.targetDir, file) });
    }
  }

  const orphans = docTags.filter((d) => !sourceTags.has(d.tag));

  return {
    sourceTags: sourceTags.size,
    docTags: docTags.length,
    orphans,
  };
}

export function checkUnusedTags(config: Omit<SyncConfig, "dryRun">): UnusedResult {
  const sourceFiles = findFilesMulti(config.sourceDir, config.sourceGlobs);
  const sourceSnippets: UnusedTag[] = [];

  for (const file of sourceFiles) {
    const content = readFileSync(file, "utf-8");
    for (const s of extractSnippets(content, file)) {
      sourceSnippets.push({ tag: s.tag, file: relative(config.sourceDir, file) });
    }
  }

  const targetFiles = findFiles(config.targetDir, config.targetGlob);
  const docTags = new Set<string>();

  for (const file of targetFiles) {
    const content = readFileSync(file, "utf-8");
    for (const tag of findDocTags(content)) {
      docTags.add(tag);
    }
  }

  const unused = sourceSnippets.filter((s) => !docTags.has(s.tag));

  return {
    sourceTags: sourceSnippets.length,
    docTags: docTags.size,
    unused,
  };
}

export interface UntaggedConfig {
  targetDir: string;
  targetGlob: string;
  excludePatterns: string[];
}

export function checkUntaggedBlocks(config: UntaggedConfig): UntaggedResult {
  const targetFiles = findFiles(config.targetDir, config.targetGlob).filter(
    (file) =>
      !config.excludePatterns.some((pattern) =>
        file.includes(pattern.replace(/\*/g, "")),
      ),
  );

  const untagged: UntaggedBlock[] = [];
  let totalBlocks = 0;
  let taggedBlocks = 0;

  for (const file of targetFiles) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");

    // Find all typescript/python code blocks (may be indented)
    const codeBlockPattern = /^\s*```(typescript|python)(?:\s|$)/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(codeBlockPattern);
      if (!match) continue;

      totalBlocks++;
      const lang = match[1];

      // Check if previous non-empty line is a tag comment
      const prevLine = lines[i - 1]?.trim() ?? "";
      const isTagged = /^\{\/\*\s*[\w-]+\s*\*\/\}$/.test(prevLine);

      if (isTagged) {
        taggedBlocks++;
        continue;
      }

      // Find code preview (first non-empty line of code)
      let preview = "";
      for (let j = i + 1; j < lines.length && j < i + 10; j++) {
        if (lines[j].startsWith("```")) break;
        if (lines[j].trim()) {
          preview = lines[j].trim().slice(0, 60);
          if (lines[j].trim().length > 60) preview += "...";
          break;
        }
      }

      untagged.push({
        file: relative(config.targetDir, file),
        line: i + 1,
        lang,
        preview,
      });
    }
  }

  return { totalBlocks, taggedBlocks, untagged };
}

export function syncSnippets(config: SyncConfig): SyncStats {
  const sourceFiles = findFilesMulti(config.sourceDir, config.sourceGlobs);

  const allSnippets: TaggedCode[] = [];
  const allPreambles: TaggedCode[] = [];

  for (const file of sourceFiles) {
    const content = readFileSync(file, "utf-8");
    allSnippets.push(...extractSnippets(content, file));
    allPreambles.push(...extractPreambles(content, file));
  }

  // Build tag -> preamble map
  const preambleMap = new Map<string, string>();
  for (const p of allPreambles) {
    if (preambleMap.has(p.tag)) {
      console.warn(`Warning: duplicate preamble "${p.tag}" in ${p.source}`);
    }
    preambleMap.set(p.tag, p.code);
  }

  // Build tag -> code map (combining preamble + snippet)
  const snippetMap = new Map<string, string>();
  for (const s of allSnippets) {
    if (snippetMap.has(s.tag)) {
      console.warn(`Warning: duplicate tag "${s.tag}" in ${s.source}`);
    }
    const preamble = preambleMap.get(s.tag);
    const code = preamble
      ? `${preamble.trimEnd()}\n\n${s.code.trim()}`
      : s.code.trim();
    snippetMap.set(s.tag, code);
  }

  // Find and update target files
  const targetFiles = findFiles(config.targetDir, config.targetGlob);

  let totalUpdated = 0;
  const results: SyncResult[] = [];

  for (const file of targetFiles) {
    const content = readFileSync(file, "utf-8");
    const {
      content: newContent,
      updated,
      skipped,
    } = replaceSnippets(content, snippetMap);

    if (updated.length > 0) {
      if (!config.dryRun) {
        writeFileSync(file, newContent);
      }
      totalUpdated += updated.length;
      results.push({
        file: relative(config.targetDir, file),
        updated,
        skipped,
      });
    }
  }

  return {
    sourceFiles: sourceFiles.length,
    snippets: snippetMap.size,
    preambles: allPreambles.length,
    targetFiles: targetFiles.length,
    updatedSnippets: totalUpdated,
    updatedFiles: results.length,
    results,
  };
}
