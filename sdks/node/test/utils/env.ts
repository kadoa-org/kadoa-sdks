import { z } from "zod/v4";

const envSchema = z.object({
  KADOA_API_KEY: z.string(),
  KADOA_PUBLIC_API_URI: z.url(),
  VCR_MODE: z.enum(["record", "replay", "auto"]).optional().default("auto"),
  VCR_DEBUG: z.enum(["true", "false"]).optional().default("false"),
  TEST_WORKFLOW_ID: z.string().optional().default("68be65160ff479ebd90f8c25"),
});

export function getTestEnv(): z.infer<typeof envSchema> {
  const result = envSchema.parse(process.env);
  return result;
}

// Alias for clarity
export const getE2ETestEnv = getTestEnv;
export const getVCRTestEnv = getTestEnv;
