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

export interface TagAnalysis {
  sourceTags: number;
  docTags: number;
  orphans: OrphanTag[];
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

// Patterns

const DOC_TAG_PATTERN =
  /[ \t]*\{\/\*\s*([\w-]+)\s*\*\/\}\s*\n[ \t]*```(?:typescript|python)/g;

function buildMarkerPatterns(start: string, end: string): RegExp[] {
  return [
    // Line comments: // @start TAG ... // @end TAG
    new RegExp(`\\/\\/\\s*${start}\\s+([\\w-]+)\\s*\\n([\\s\\S]*?)\\/\\/\\s*${end}\\s+\\1`, "g"),
    // Block comments: /* @start TAG ... @end TAG */
    new RegExp(`\\/\\*\\s*${start}\\s+([\\w-]+)\\s*\\n([\\s\\S]*?)${end}\\s+\\1\\s*\\*\\/`, "g"),
    // Python comments: # @start TAG ... # @end TAG
    new RegExp(`#\\s*${start}\\s+([\\w-]+)\\s*\\n([\\s\\S]*?)#\\s*${end}\\s+\\1`, "g"),
  ];
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

interface ExtractConfig {
  startMarker: string;
  endMarker: string;
  transform?: (code: string) => string;
}

function extractTagged(
  content: string,
  source: string,
  config: ExtractConfig,
): TaggedCode[] {
  const results: TaggedCode[] = [];
  const patterns = buildMarkerPatterns(config.startMarker, config.endMarker);

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const code = config.transform ? config.transform(match[2]) : match[2];
      results.push({ tag: match[1], code: dedent(code), source });
    }
  }

  return results;
}

function stripCommentPrefix(code: string): string {
  return code
    .split("\n")
    .map((line) => line.replace(/^(\s*)(?:\/\/|#)\s?/, "$1"))
    .join("\n");
}

function extractSnippets(content: string, source: string): TaggedCode[] {
  return extractTagged(content, source, {
    startMarker: "@docs-start",
    endMarker: "@docs-end",
  });
}

function extractPreambles(content: string, source: string): TaggedCode[] {
  return extractTagged(content, source, {
    startMarker: "@docs-preamble",
    endMarker: "@docs-preamble-end",
    transform: stripCommentPrefix,
  });
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
  return [...content.matchAll(DOC_TAG_PATTERN)].map((m) => m[1]);
}

// Main operations

export function analyzeTags(config: Omit<SyncConfig, "dryRun">): TagAnalysis {
  const sourceFiles = findFilesMulti(config.sourceDir, config.sourceGlobs);
  const sourceTagSet = new Set<string>();
  const sourceSnippets: UnusedTag[] = [];

  for (const file of sourceFiles) {
    const content = readFileSync(file, "utf-8");
    for (const s of extractSnippets(content, file)) {
      sourceTagSet.add(s.tag);
      sourceSnippets.push({ tag: s.tag, file: relative(config.sourceDir, file) });
    }
  }

  const targetFiles = findFiles(config.targetDir, config.targetGlob);
  const docTagSet = new Set<string>();
  const docTagsWithFile: OrphanTag[] = [];

  for (const file of targetFiles) {
    const content = readFileSync(file, "utf-8");
    for (const tag of findDocTags(content)) {
      docTagSet.add(tag);
      docTagsWithFile.push({ tag, file: relative(config.targetDir, file) });
    }
  }

  return {
    sourceTags: sourceTagSet.size,
    docTags: docTagsWithFile.length,
    orphans: docTagsWithFile.filter((d) => !sourceTagSet.has(d.tag)),
    unused: sourceSnippets.filter((s) => !docTagSet.has(s.tag)),
  };
}

export function checkOrphanTags(config: Omit<SyncConfig, "dryRun">): CheckResult {
  const { sourceTags, docTags, orphans } = analyzeTags(config);
  return { sourceTags, docTags, orphans };
}

export function checkUnusedTags(config: Omit<SyncConfig, "dryRun">): UnusedResult {
  const { sourceTags, docTags, unused } = analyzeTags(config);
  return { sourceTags, docTags, unused };
}

export interface UntaggedConfig {
  targetDir: string;
  targetGlob: string;
  excludePatterns: string[];
}

function matchesAnyGlob(filepath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => new Glob(pattern).match(filepath));
}

export function checkUntaggedBlocks(config: UntaggedConfig): UntaggedResult {
  const targetFiles = findFiles(config.targetDir, config.targetGlob).filter(
    (file) => !matchesAnyGlob(file, config.excludePatterns),
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
