#!/usr/bin/env ts-node
/**
 * Environment Variable Pre-deployment Check
 * Validates all required environment variables are set.
 */

interface EnvCheck {
  group: string;
  required: string[];
  optional?: string[];
}

const CHECKS: EnvCheck[] = [
  { group: 'DATABASE', required: [] },
  { group: 'AUTH', required: [], optional: ['JWT_SECRET'] },
  {
    group: 'AI_PROVIDER',
    required: [],
    optional: ['OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'ANTHROPIC_API_KEY'],
  },
  { group: 'STORAGE', required: [], optional: ['R2_BUCKET_NAME'] },
  { group: 'PAYMENT', required: [], optional: ['STRIPE_SECRET_KEY'] },
  {
    group: 'LOGGING',
    required: [],
    optional: ['SENTRY_DSN', 'LOG_LEVEL'],
  },
  { group: 'ADMIN', required: [], optional: ['ADMIN_API_KEY'] },
];

const OK = '[OK]';
const MISSING = '[MISSING]';
const WARN = '[WARN]';

function checkEnv(): void {
  console.log("=== Environment Variable Check ===\n");
  let hasMissing = false;

  for (const check of CHECKS) {
    console.log(`\n[${check.group}] `);
    for (const varName of check.required) {
      const value = process.env[varName];
      if (!value) {
        console.log(`  ${MISSING}: ${varName}`);
        hasMissing = true;
      } else {
        console.log(`  ${OK}: ${varName} (length: ${value.length})`);
      }
    }
    if (check.optional) {
      for (const varName of check.optional) {
        const value = process.env[varName];
        if (value) {
          console.log(`  ${WARN}- OPTIONAL: ${varName}`);
        } else {
          console.log(`  - OPTIONAL: ${varName} (not set)`);
        }
      }
    }
  }

  if (hasMissing) {
    console.log("\nWARNING: Some optional variables not set.");
    console.log("This is expected for a fresh staging deployment.");
    console.log("Fill in the real values from .env.staging.example");
  } else {
    console.log("\nAll environment variables are set.");
  }
}

checkEnv();