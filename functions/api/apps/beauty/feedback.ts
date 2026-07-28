import { readSessionId } from "../../../../shared/auth/cookies.ts";
import { getSession } from "../../../../shared/auth/session.ts";
import { getBeautyFeedbackService } from "../../../../shared/services/beauty/BeautyFeedbackService";

export const onRequestPost = async (context: any) => {
  // Auth: require session
  const sessionId = readSessionId(context.request.headers.get("Cookie"));
  let userId: string | null = null;
  if (sessionId) {
    const session = await getSession(context.env, sessionId);
    if (session && session.user?.id) userId = session.user.id;
  }

  if (!userId) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Authentication required" }
    }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  try {
    const body = await context.request.json();
    const reportId = body.reportId;
    const rating = body.rating;
    const comment = body.comment || undefined;

    if (!reportId || !rating || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: "INVALID_INPUT", message: "Required: reportId (string), rating (1-5)" }
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const feedbackService = getBeautyFeedbackService(context.env?.DB);
    if (feedbackService && context.env?.DB) {
      await feedbackService.createFeedback(userId, reportId, rating, comment);
    }

    return new Response(JSON.stringify({ success: true, data: { message: "Feedback submitted" } }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to submit feedback" }
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

