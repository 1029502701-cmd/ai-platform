#!/usr/bin/env ts-node
/**
 * Database Health Check Script
 * Verifies D1 connection and critical tables exist.
 */

import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../shared/schema/database-schema';

interface DBEnv {
  DB: D1Database;
}

async function healthCheck(env?: DBEnv): Promise<void> {
  console.log("=== Database Health Check ===\n");
  
  // Test 1: Connection
  try {
    const result = await env?.DB?.prepare('SELECT 1 as test').first();
    if (result?.test === 1) {
      console.log("✅ Database connection: OK");
    } else {
      console.log("❌ Database connection: FAILED");
    }
  } catch (e) {
    console.log("❌ Database connection: ERROR -", e instanceof Error ? e.message : String(e));
    return;
  }
  
  // Test 2: Critical tables
  const criticalTables = [
    'users', 'sessions', 'ai_models', 'prompts',
    'feature_flags', 'audit_logs', 'billing_plans'
  ];
  
  let tableCount = 0;
  for (const table of criticalTables) {
    try {
      const exists = await env?.DB?.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
      ).bind(table).first();
      if (exists) {
        console.log("✅ Table exists:", table);
        tableCount++;
      } else {
        console.log("⚠️  Table missing:", table);
      }
    } catch (e) {
      console.log("⚠️  Could not check table:", table);
    }
  }
  
  console.log("\n📊 Tables found: " + tableCount + "/" + criticalTables.length);
  console.log("\n✅ Database health check complete.");
}

// Run if called directly
if (require.main === module) {
  healthCheck({ DB: null as any });
}

export { healthCheck };
