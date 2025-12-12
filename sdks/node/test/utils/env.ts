import { z } from "zod/v4";

const envSchema = z.object({
  KADOA_API_KEY: z.string(),
  KADOA_PUBLIC_API_URI: z.url(),
  TEST_WORKFLOW_ID: z.string().optional().default("68be65160ff479ebd90f8c25"),
});

export function getTestEnv(): z.infer<typeof envSchema> {
  const result = envSchema.parse(process.env);
  return result;
}

export const getE2ETestEnv = getTestEnv;
