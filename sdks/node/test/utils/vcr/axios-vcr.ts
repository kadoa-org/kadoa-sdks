import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";

export type VCRMode = "record" | "replay" | "auto";

export interface VCROptions {
  mode?: VCRMode;
  cacheDir: string;
  sanitize?: boolean;
  debug?: boolean;
}

interface CachedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string | string[]>;
  data: any;
  recordedAt: string;
  requestHash: string;
  isError?: boolean;
}

/**
 * Axios VCR (Video Cassette Recorder) for recording and replaying HTTP responses
 * Optimized for Bun's file I/O capabilities
 */
export class AxiosVCR {
  private mode: VCRMode;
  private cacheDir: string;
  private sanitize: boolean;
  private debug: boolean;
  private requestInterceptorId?: number;
  private responseInterceptorId?: number;

  constructor(
    private axiosInstance: AxiosInstance,
    options: VCROptions,
  ) {
    this.mode = options.mode || (process.env.VCR_MODE as VCRMode) || "auto";
    this.cacheDir = options.cacheDir;
    this.sanitize = options.sanitize ?? true;
    this.debug = options.debug ?? false;

    // Setup interceptors immediately (ensureCacheDir will be called when needed)
    this.setupInterceptors();
  }

  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Stable serialization for deterministic cache keys
   */
  private stableSerialize(value: any): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value !== "object") return JSON.stringify(value);

    // Handle Buffer/ArrayBuffer
    if (value instanceof Buffer) {
      return `buffer:${crypto.createHash("sha256").update(value).digest("hex")}`;
    }
    if (value instanceof ArrayBuffer) {
      return `arraybuffer:${crypto.createHash("sha256").update(Buffer.from(value)).digest("hex")}`;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return `[${value.map((v) => this.stableSerialize(v)).join(",")}]`;
    }

    // Handle objects
    const keys = Object.keys(value).sort();
    const pairs = keys.map(
      (k) => `${JSON.stringify(k)}:${this.stableSerialize(value[k])}`,
    );
    return `{${pairs.join(",")}}`;
  }

  /**
   * Generate a deterministic cache key from request config
   */
  private getCacheKey(config: AxiosRequestConfig): string {
    const keyParts = {
      method: (config.method || "GET").toUpperCase(),
      baseURL: config.baseURL || "",
      url: config.url || "",
      params: config.params || {},
      data: config.data || null,
    };

    const keyString = this.stableSerialize(keyParts);
    return crypto.createHash("md5").update(keyString).digest("hex");
  }

  /**
   * Get cache file path for a request
   */
  private async getCachePath(cacheKey: string): Promise<string> {
    // Use first 2 chars as subdirectory to avoid too many files in one dir
    const subdir = cacheKey.substring(0, 2);
    const dir = path.join(this.cacheDir, subdir);

    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }

    return path.join(dir, `${cacheKey}.json`);
  }

  /**
   * Sanitize sensitive data from response
   */
  private sanitizeResponse(response: AxiosResponse): AxiosResponse {
    if (!this.sanitize) return response;

    const sanitized = { ...response };

    if (sanitized.headers) {
      const headers = { ...sanitized.headers };
      // Remove sensitive headers
      delete headers["x-api-key"];
      delete headers.authorization;
      delete headers.cookie;
      delete headers["set-cookie"];
      // Normalize dynamic headers
      headers.date = "NORMALIZED_DATE";
      headers["x-request-id"] = "NORMALIZED_REQUEST_ID";
      sanitized.headers = headers;
    }

    // Sanitize data - customize based on your API
    if (sanitized.data) {
      // Deep clone to avoid mutating original
      sanitized.data = structuredClone(sanitized.data);
      // Example: normalize timestamps
      this.normalizeTimestamps(sanitized.data);
    }

    return sanitized;
  }

  /**
   * Recursively normalize timestamps in data
   */
  private normalizeTimestamps(obj: any): void {
    if (!obj || typeof obj !== "object") return;

    for (const key in obj) {
      if (key.includes("At") || key.includes("_at") || key === "timestamp") {
        // Normalize date fields
        if (
          typeof obj[key] === "string" &&
          /\d{4}-\d{2}-\d{2}/.test(obj[key])
        ) {
          obj[key] = "2024-01-01T00:00:00.000Z";
        }
      } else if (typeof obj[key] === "object") {
        this.normalizeTimestamps(obj[key]);
      }
    }
  }

  /**
   * Load cached response
   */
  private async loadCachedResponse(
    cacheKey: string,
  ): Promise<CachedResponse | null> {
    const cachePath = await this.getCachePath(cacheKey);

    try {
      await fs.access(cachePath);
    } catch {
      return null;
    }

    try {
      const content = await fs.readFile(cachePath, "utf-8");
      const cached = JSON.parse(content) as CachedResponse;

      if (this.debug) {
        console.log(`[VCR] Loaded cached response for ${cacheKey}`);
      }

      return cached;
    } catch (error) {
      if (this.debug && (error as any).code !== "ENOENT") {
        console.error(`[VCR] Failed to load cache ${cachePath}:`, error);
      }
      return null;
    }
  }

  /**
   * Save response to cache
   */
  private async saveResponse(
    cacheKey: string,
    response: AxiosResponse | AxiosError["response"],
    isError = false,
  ): Promise<void> {
    if (!response) return;

    const cachePath = await this.getCachePath(cacheKey);
    const sanitized = this.sanitizeResponse(response);

    const cached: CachedResponse = {
      status: sanitized.status,
      statusText: sanitized.statusText,
      headers: sanitized.headers as Record<string, string | string[]>,
      data: sanitized.data,
      recordedAt: new Date().toISOString(),
      requestHash: cacheKey,
      isError,
    };

    try {
      await fs.writeFile(cachePath, JSON.stringify(cached, null, 2), "utf-8");

      if (this.debug) {
        console.log(
          `[VCR] Saved ${isError ? "error " : ""}response to ${cachePath}`,
        );
      }
    } catch (error) {
      if (this.debug) {
        console.error(`[VCR] Failed to save cache ${cachePath}:`, error);
      }
    }
  }

  /**
   * Setup Axios interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.requestInterceptorId = this.axiosInstance.interceptors.request.use(
      async (config) => {
        const cacheKey = this.getCacheKey(config);

        // Store cache key in config for response interceptor
        (config as any).__vcrCacheKey = cacheKey;

        // In replay mode, try to load cached response
        if (this.mode === "replay" || this.mode === "auto") {
          const cached = await this.loadCachedResponse(cacheKey);

          if (cached) {
            // Use custom adapter to return cached response
            config.adapter = async () => {
              if (this.debug) {
                console.log(
                  `[VCR] Replaying ${cached.isError ? "error " : ""}response for ${config.url}`,
                );
              }

              // If it was an error response, throw it
              if (cached.isError) {
                const error = new Error("Request failed") as any;
                error.response = {
                  data: cached.data,
                  status: cached.status,
                  statusText: cached.statusText,
                  headers: cached.headers,
                  config: config,
                  request: {},
                };
                error.config = config;
                error.code = "ERR_BAD_RESPONSE";
                throw error;
              }

              return {
                data: cached.data,
                status: cached.status,
                statusText: cached.statusText,
                headers: cached.headers,
                config: config,
                request: {},
              } as AxiosResponse;
            };
          } else if (this.mode === "replay") {
            // In replay mode, fail if no cache exists
            throw new Error(
              `[VCR] No cached response for ${config.url}. ` +
                `Run with VCR_MODE=record to record the response.`,
            );
          }
        }

        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor
    this.responseInterceptorId = this.axiosInstance.interceptors.response.use(
      async (response) => {
        const cacheKey = (response.config as any).__vcrCacheKey;

        // In record or auto mode, save the response
        if (cacheKey && (this.mode === "record" || this.mode === "auto")) {
          // Only save if this was a real request (not replayed)
          const isReplayedResponse = (response.config as any).__vcrReplayed;
          if (!isReplayedResponse) {
            await this.ensureCacheDir();
            await this.saveResponse(cacheKey, response, false);
          }
        }

        return response;
      },
      async (error: AxiosError) => {
        const cacheKey = (error.config as any)?.__vcrCacheKey;

        // In record or auto mode, save error responses
        if (
          cacheKey &&
          error.response &&
          (this.mode === "record" || this.mode === "auto")
        ) {
          // Only save if this was a real request (not replayed)
          const isReplayedResponse = (error.config as any)?.__vcrReplayed;
          if (!isReplayedResponse) {
            await this.ensureCacheDir();
            await this.saveResponse(cacheKey, error.response, true);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * Eject interceptors and clean up
   */
  public dispose(): void {
    if (this.requestInterceptorId !== undefined) {
      this.axiosInstance.interceptors.request.eject(this.requestInterceptorId);
    }
    if (this.responseInterceptorId !== undefined) {
      this.axiosInstance.interceptors.response.eject(
        this.responseInterceptorId,
      );
    }
  }

  /**
   * Clear all cached responses
   */
  public async clearCache(): Promise<void> {
    try {
      await fs.rm(this.cacheDir, { recursive: true, force: true });
      await this.ensureCacheDir();
      if (this.debug) {
        console.log(`[VCR] Cleared cache directory: ${this.cacheDir}`);
      }
    } catch (error) {
      if (this.debug) {
        console.error(`[VCR] Failed to clear cache:`, error);
      }
    }
  }

  /**
   * Get current mode
   */
  public getMode(): VCRMode {
    return this.mode;
  }

  /**
   * Set mode dynamically
   */
  public setMode(mode: VCRMode): void {
    this.mode = mode;
    if (this.debug) {
      console.log(`[VCR] Mode changed to: ${mode}`);
    }
  }
}
