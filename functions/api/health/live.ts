// @ts-ignore
export const onRequestGet = async (context) => {
  const env = context.env;
  try {
    const db = env.DB;
    let live = false;
    if (db?.prepare) { 
      try { 
        await db.prepare('SELECT 1').first(); 
        live = true; 
      } catch {} 
    }
    return new Response(JSON.stringify({ live }), {
      status: live ? 200 : 503,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ live: false }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
};
