import { SDK_NAME, SDK_VERSION } from "../../version";

const NPM_REGISTRY_URL = "https://registry.npmjs.org";
const PACKAGE_NAME = "@kadoa/node-sdk";

interface NpmPackageInfo {
  "dist-tags": {
    latest: string;
  };
}

/**
 * Checks if a newer version of the SDK is available on npm
 * This is a non-blocking check that runs in the background
 */
export async function checkForUpdates(): Promise<void> {
  try {
    const response = await fetch(`${NPM_REGISTRY_URL}/${PACKAGE_NAME}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as NpmPackageInfo;
    const latestVersion = data["dist-tags"]?.latest;

    if (!latestVersion) {
      return;
    }

    if (isNewerVersion(latestVersion, SDK_VERSION)) {
      // Use console.warn to ensure the message is visible (not just in debug mode)
      console.warn(
        `⚠️  A new version of ${SDK_NAME} is available: ${latestVersion} (current: ${SDK_VERSION}). Update with: npm install ${PACKAGE_NAME}@latest`,
      );
    }
  } catch (error) {
    // Silently fail - version check should not break client initialization
  }
}

/**
 * Compares two semantic version strings
 * Returns true if version1 is newer than version2
 */
function isNewerVersion(version1: string, version2: string): boolean {
  const v1Parts = version1.split(".").map(Number);
  const v2Parts = version2.split(".").map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part > v2Part) {
      return true;
    }
    if (v1Part < v2Part) {
      return false;
    }
  }

  return false;
}

