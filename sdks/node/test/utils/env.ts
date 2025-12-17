import { z } from "zod/v4";

const envSchema = z.object({
  KADOA_API_KEY: z.string(),
  KADOA_PUBLIC_API_URI: z.url(),
});

export function getTestEnv(): z.infer<typeof envSchema> {
  const result = envSchema.parse(process.env);
  return result;
}
