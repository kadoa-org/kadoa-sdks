import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";

/**
 * Utilities for managing VCR recordings
 */
async function clearAllCache(
	cacheDir = "test/fixtures/vcr-cache",
): Promise<void> {
	try {
		await fsPromises.rm(cacheDir, { recursive: true, force: true });
	} catch {
		// Ignore if directory doesn't exist
	}
}

async function clearSuiteCache(
	suiteName: string,
	cacheDir = "test/fixtures/vcr-cache",
): Promise<void> {
	const suitePath = path.join(cacheDir, suiteName);
	try {
		await fsPromises.rm(suitePath, { recursive: true, force: true });
	} catch {
		// Ignore if directory doesn't exist
	}
}

function listRecordings(cacheDir = "test/fixtures/vcr-cache"): string[] {
	const recordings: string[] = [];

	if (!fs.existsSync(cacheDir)) {
		return recordings;
	}

	function walkDir(dir: string) {
		const files = fs.readdirSync(dir);
		for (const file of files) {
			const filePath = path.join(dir, file);
			const stat = fs.statSync(filePath);

			if (stat.isDirectory()) {
				walkDir(filePath);
			} else if (file.endsWith(".json")) {
				recordings.push(filePath);
			}
		}
	}

	walkDir(cacheDir);
	return recordings;
}

function getCacheStats(cacheDir = "test/fixtures/vcr-cache"): {
	totalRecordings: number;
	totalSize: number;
	oldestRecording: Date | null;
	newestRecording: Date | null;
} {
	const recordings = listRecordings(cacheDir);
	let totalSize = 0;
	let oldestDate: Date | null = null;
	let newestDate: Date | null = null;

	for (const recording of recordings) {
		const stat = fs.statSync(recording);
		totalSize += stat.size;

		if (!oldestDate || stat.mtime < oldestDate) {
			oldestDate = stat.mtime;
		}
		if (!newestDate || stat.mtime > newestDate) {
			newestDate = stat.mtime;
		}
	}

	return {
		totalRecordings: recordings.length,
		totalSize,
		oldestRecording: oldestDate,
		newestRecording: newestDate,
	};
}

async function cleanOldRecordings(
	maxAgeDays: number,
	cacheDir = "test/fixtures/vcr-cache",
): Promise<number> {
	const recordings = listRecordings(cacheDir);
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

	let deletedCount = 0;

	for (const recording of recordings) {
		const stat = await fsPromises.stat(recording);
		if (stat.mtime < cutoffDate) {
			await fsPromises.unlink(recording);
			deletedCount++;
		}
	}

	return deletedCount;
}

async function validateRecording(filePath: string): Promise<boolean> {
	try {
		const content = await fsPromises.readFile(filePath, "utf-8");
		const parsed = JSON.parse(content);

		const requiredFields = [
			"status",
			"data",
			"headers",
			"recordedAt",
			"requestHash",
		];
		for (const field of requiredFields) {
			if (!(field in parsed)) {
				return false;
			}
		}

		return true;
	} catch {
		return false;
	}
}

async function validateAllRecordings(
	cacheDir = "test/fixtures/vcr-cache",
): Promise<{
	valid: number;
	invalid: string[];
}> {
	const recordings = listRecordings(cacheDir);
	const invalid: string[] = [];
	let valid = 0;

	for (const recording of recordings) {
		if (await validateRecording(recording)) {
			valid++;
		} else {
			invalid.push(recording);
		}
	}

	return { valid, invalid };
}

async function exportRecordings(
	outputFile: string,
	cacheDir = "test/fixtures/vcr-cache",
): Promise<void> {
	const recordings = listRecordings(cacheDir);
	const archive: Record<string, unknown> = {};

	for (const recording of recordings) {
		const content = await fsPromises.readFile(recording, "utf-8");
		const key = path.relative(cacheDir, recording);
		archive[key] = JSON.parse(content);
	}

	await fsPromises.writeFile(
		outputFile,
		JSON.stringify(archive, null, 2),
		"utf-8",
	);
}

async function importRecordings(
	inputFile: string,
	cacheDir = "test/fixtures/vcr-cache",
): Promise<void> {
	const content = await fsPromises.readFile(inputFile, "utf-8");
	const archive = JSON.parse(content) as Record<string, unknown>;

	for (const [relativePath, data] of Object.entries(archive)) {
		const fullPath = path.join(cacheDir, relativePath);
		const dir = path.dirname(fullPath);

		await fsPromises.mkdir(dir, { recursive: true });
		await fsPromises.writeFile(
			fullPath,
			JSON.stringify(data, null, 2),
			"utf-8",
		);
	}
}

export const VCRUtils = {
	clearAllCache,
	clearSuiteCache,
	listRecordings,
	getCacheStats,
	cleanOldRecordings,
	validateRecording,
	validateAllRecordings,
	exportRecordings,
	importRecordings,
} as const;

/**
 * Test helper to ensure VCR mode
 */
export function ensureVCRMode(mode: "record" | "replay" | "auto"): void {
	if (process.env.VCR_MODE && process.env.VCR_MODE !== mode) {
		throw new Error(
			`Test requires VCR_MODE=${mode} but current mode is ${process.env.VCR_MODE}`,
		);
	}
}

/**
 * Test helper to skip test if in replay mode and no cache exists
 */
export function skipIfNoCache(cacheDir = "test/fixtures/vcr-cache"): boolean {
	if (process.env.VCR_MODE === "replay") {
		const recordings = VCRUtils.listRecordings(cacheDir);
		if (recordings.length === 0) {
			return true;
		}
	}
	return false;
}

/**
 * Strict helper: in replay mode, fail if cache is missing for this suite.
 */
export function requireVCRCache(cacheDir = "test/fixtures/vcr-cache"): void {
	if (process.env.VCR_MODE === "replay") {
		const recordings = VCRUtils.listRecordings(cacheDir);
		if (recordings.length === 0) {
			throw new Error(
				`[VCR] Missing cache at ${cacheDir} in replay mode. Record first with VCR_MODE=record.`,
			);
		}
	}
}
