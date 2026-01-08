import { config } from 'dotenv';
import { z } from 'zod';

// Load .env file if it exists (for local development)
// In production platforms like Railway, env vars are set directly in process.env
// Use override: false to ensure process.env (from Railway) takes precedence
config({ override: false });

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Retell AI
  RETELL_API_KEY: z.string().min(1),
  RETELL_AGENT_ID: z.string().min(1),
  RETELL_PHONE_NUMBER: z.string().optional(), // Optional for test mode
  RETELL_WEBHOOK_SECRET: z.string().min(1),
  RETELL_TEST_MODE: z.string().default('false'), // Enable test mode without real phone

  // Anthropic (Claude)
  ANTHROPIC_API_KEY: z.string().min(1),

  // Vercel Blob
  BLOB_READ_WRITE_TOKEN: z.string().min(1),

  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_BASE_URL: z.string().url(),

  // Authentication
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Frontend
  FRONTEND_URL: z.string().url().optional(),
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
      console.error('\n💡 Make sure all required environment variables are set in Railway:');
      console.error('   - Go to your Railway project → Variables tab');
      console.error('   - Add all required variables listed above');
      console.error(`\n📋 Current NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();
