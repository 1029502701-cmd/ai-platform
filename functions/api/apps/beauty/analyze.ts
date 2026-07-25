import { analyzeBeauty } from '../../../../shared/services/plugins/beauty.service';

export const onRequestPost = async (context: any) => {
  try {
    const text = await context.request.text();
    const body = text ? JSON.parse(text) : {};

    // Validate userContext
    if (!body.userContext) {
      return new Response(
        JSON.stringify({
          success: false,
          data: null,
          error: { code: 'MISSING_USER_CONTEXT', message: '缺少 userContext' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }

    // validate optional imageUrl
    if (body.imageUrl !== undefined && typeof body.imageUrl !== 'string') {
      return new Response(
        JSON.stringify({ success: false, data: null, error: { code: 'INVALID_IMAGE_URL', message: 'imageUrl must be a string' } }),
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
      );
    }

    const { reportId, report } = await analyzeBeauty(body);

    return new Response(
      JSON.stringify({
        success: true,
        data: { reportId, report },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        error: { code: 'INTERNAL_ERROR', message: e.message || '分析失败' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  }
};
