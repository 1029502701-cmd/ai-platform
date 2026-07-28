import type { QueueBindings } from '@cloudflare/workers-types';

interface Env {
  AI_TASK_QUEUE: Queue;
  DB: D1Database;
  USER_CACHE: KVNamespace;
  ASSETS_BUCKET: R2Bucket;
  // Other bindings as needed
}

export async function handleBeautyTask(context: any, env: Env) {
  const task = context.request.body; // Get queue payload
  const userId = task.userId;
  const imageUrl = task.imageUrl;
  const faceAnalysis = task.faceAnalysis;

  // Re-use the existing analyzeBeauty logic (import it)
  // Note: In a real worker, you'd need to import the service carefully
  
  try {
    // Perform the beauty analysis (would call into shared services)
    // This is a placeholder - actual implementation would need to
    // import beauty service and call analyzeBeauty
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create a fake report
    const report = {
      reportId: 'rpt_' + Date.now(),
      userId,
      faceShape: { shape: 'oval', confidence: 0.5 },
      features: { overallHarmony: 75 },
      makeup: { base: 'natural' },
      createdAt: new Date().toISOString()
    };

    // Save to D1 (simplified)
    await env.DB.prepare(
      'INSERT INTO beauty_reports (id, user_id, report_json) VALUES (?, ?, ?)'
    ).bind(reportId, userId, JSON.stringify(report)).run();

    return { success: true, report };
  } catch (error) {
    console.error('Beauty task failed:', error);
    throw error; // Queue will handle retry based on config
  }
}

export const onRequest: Haenlder = async (request, env, context) => {
  // This worker is triggered by Cloudflare Queues
  // The queue envelope is provided in the request context
  try {
    const queueData = await request.json();
    const batch = queueData.batch || [];
    
    const results = [];
    for (const task of batch) {
      try {
        const result = await handleBeautyTask({ request: { body: task } }, env, context);
        results.push(result);
      } catch (err) {
        results.push({ error: String(err) });
      }
    }
    
    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
};
