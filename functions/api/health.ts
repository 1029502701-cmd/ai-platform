// @ts-ignore
export const onRequestGet = async (context) => {
  const env = context.env;
  try {
    const db = env.DB;
    const kv = env.USER_CACHE;
    let dbOk = false;
    let kvOk = false;
    let aiProvidersOk = true;
    let queueOk = false;

    if (db?.prepare) { 
      try { 
        await db.prepare('SELECT 1').first(); 
        dbOk = true; 
      } catch {} 
    }
    if (kv) { 
      try { 
        await kv.get('__hc__'); 
        kvOk = true; 
      } catch {} 
    }

    let activeProviders = 0;
    const keys = ['OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_AI_API_KEY'];
    for (const k of keys) {
      const v = env[k];
      if (v && String(v).length > 3) activeProviders++;
    }
    aiProvidersOk = activeProviders >= 1;
    queueOk = !!env.AI_TASK_QUEUE;

    return new Response(JSON.stringify({
      status: 'healthy',
      checks: {
        database: dbOk ? 'ok' : 'error',
        cache: kvOk ? 'ok' : 'missing',
        aiProviders: aiProvidersOk ? ('ok(' + activeProviders + ')') : 'warning',
        queues: queueOk ? 'ok' : 'skipped',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({
      status: 'error',
      error: e instanceof Error ? e.message : String(e),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
