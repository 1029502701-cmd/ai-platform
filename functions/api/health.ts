export const onRequestGet = () => {
  return new Response(
    JSON.stringify({
      success: true,
      data: { status: "ok" },
      error: null,
      meta: { timestamp: new Date().toISOString() },
    }),
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
};
