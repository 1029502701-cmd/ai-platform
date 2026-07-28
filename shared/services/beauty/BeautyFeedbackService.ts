import { D1Database } from "@cloudflare/workers-types";

export class BeautyFeedbackService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async createFeedback(userId: string, reportId: string, rating: number, comment?: string): Promise<void> {
    try {
      const feedbackId = "fb_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      await this.db.prepare(
        "INSERT INTO beauty_feedback (id, user_id, report_id, rating, comment) VALUES (?, ?, ?, ?, ?)"
      ).bind(feedbackId, userId, reportId, rating, comment || null).run();
    } catch (e) {
      console.warn("Feedback recording failed", e);
    }
  }

  async getFeedbackStats(reportId?: string): Promise<{count: number, averageRating: number, comments:Array<string>}> {
    try {
      let where = "";
      let binds = [];
      if (reportId) {
        where = " WHERE report_id = ?";
        binds = [reportId];
      }
      const total = await this.db.prepare("SELECT COUNT(*) as c FROM beauty_feedback" + where).first(binds);
      const avg = await this.db.prepare("SELECT AVG(rating) as avg FROM beauty_feedback" + where).first(binds);
      
      // Get recent comments
      const commentsRes = await this.db.prepare("SELECT comment FROM beauty_feedback" + where + " ORDER BY created_at DESC LIMIT 5").all(binds);
      const comments = commentsRes.map(r => r.comment || "").filter(c => c);
      
      return {
        count: Number(total?.c || 0),
        averageRating: Number(avg?.avg || 0),
        comments
      };
    } catch (e) {
      console.error("Feedback stats error", e);
      return { count: 0, averageRating: 0, comments: [] };
    }
  }
}

export function getBeautyFeedbackService(db: D1Database) {
  return new BeautyFeedbackService(db);
}

export default BeautyFeedbackService;


