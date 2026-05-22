import type { BearerTokenProvider } from "./types";

/**
 * Resolve a {@link BearerTokenProvider} to its string value.
 * Awaits a Promise return when the provider is async.
 */
export async function resolveBearerToken(
  provider: BearerTokenProvider,
): Promise<string> {
  return typeof provider === "function" ? await provider() : provider;
}
