import type { PagesFunction } from '@cloudflare/workers-types';

interface CheckResult {
  ok: boolean;
  message?: string;
}

async function checkDatabase(db: any): CheckResult {
  if (!db || !db.prepare) {
    return { ok: false, message: 'Database not available' };
  }
  try {
    await db.prepare('SELECT 1').first();
    return { ok: true, message: 'D1 connected' };
  } catch (e) {
    return { ok: false, message: 'Database query failed: ' + (e as Error)?.message };
  }
}

async function checkR2(bucket: any): CheckResult {
  if (!bucket || typeof bucket.put !== 'function') {
    return { ok: false, message: 'R2 bucket not configured' };
  }
  try {
    // Test with a lightweight operation
    const testKey = '__hc_test_' + Date.now();
    await bucket.put(testKey, new Uint8Array([0]), { httpMetadata: { contentType: 'text/plain' } });
    // Clean up (optional, could leave test object)
    await bucket.delete(testKey);
    return { ok: true, message: 'R2 accessible' };
  } catch (e) {
    return { ok: false, message: 'R2 test failed: ' + (e as Error)?.message };
  }
}

async function checkAI(env: any): CheckResult {
  const activeKeys = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_AI_API_KEY', 'DEEPSEEK_API_KEY'];
  let activeCount = 0;
  for (const key of activeKeys) {
    const value = env?.[key];
    if (value && String(value).length > 3) {
      activeCount++;
    }
  }
  if (activeCount >= 1) {
    return { ok: true, message: ${activeCount} AI provider(s) configured };
  }
  return { ok: false, message: 'No API keys configured for AI providers' };
}

async function checkQueues(env: any): CheckResult {
  const hasQueue = !!env?.AI_TASK_QUEUE;
  if (hasQueue) {
    return { ok: true, message: 'Queues configured' };
  }
  return { ok: false, message: 'Queue not configured (optional for beauty module)' };
}

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const dbCheck = checkDatabase(context.env?.DB);
    const r2Check = checkR2(context.env?.ASSETS_BUCKET);
    const aiCheck = checkAI(context.env);
    const queueCheck = checkQueues(context.env);

    const [dbRes, r2Res, aiRes, queueRes] = await Promise.all([dbCheck, r2Check, aiCheck, queueCheck]);

    const allOk = dbRes.ok && r2Res.ok && aiRes.ok;

    const response = {
      status: allOk ? 'ok' : 'error',
      module: 'beauty',
      database: dbRes.ok,
      storage: r2Res.ok,
      ai: aiRes.ok,
      timestamp: Date.now(),
      checks: {
        database: dbRes,
        storage: r2Res,
        ai: aiRes,
        queues: queueRes,
      },
    };

    return new Response(JSON.stringify(response), {
      status: allOk ? 200 : 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e: any) {
    const response = {
      status: 'error',
      module: 'beauty',
      error: 'Health check failed: ' + (e.message || 'Unknown error'),
      timestamp: Date.now(),
    };
    return new Response(JSON.stringify(response), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
};

