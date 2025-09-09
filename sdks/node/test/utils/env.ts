import { z } from "zod";

const envSchema = z.object({
	TEST_USER_API_KEY: z.string(),
	KADOA_BASE_URL: z.url(),
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
