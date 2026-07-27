// @ts-ignore
export const onRequestGet = async (context) => {
  const env = context.env;
  try {
    const db = env.DB;
    let ready = false;
    if (db?.prepare) { 
      try { 
        await db.prepare('SELECT 1').first(); 
        ready = true; 
      } catch {} 
    }
    return new Response(JSON.stringify({ status: ready ? 'ready' : 'not_ready', dbConnected: ready }), {
      status: ready ? 200 : 503,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ status: 'not_ready', dbConnected: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
