import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Retell AI
  RETELL_API_KEY: z.string().min(1),
  RETELL_AGENT_ID: z.string().min(1),
  RETELL_PHONE_NUMBER: z.string().min(1),
  RETELL_WEBHOOK_SECRET: z.string().min(1),

  // Anthropic (Claude)
  ANTHROPIC_API_KEY: z.string().min(1),

  // Vercel Blob
  BLOB_READ_WRITE_TOKEN: z.string().min(1),

  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_BASE_URL: z.string().url(),
});

function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => e.path.join('.')).join(', ');
      console.error('❌ Environment validation failed:');
      console.error(`Missing or invalid variables: ${missingVars}`);
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();
