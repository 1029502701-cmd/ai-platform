import type { DailyUsageStats, ServiceUsageStats, UserUsageStats } from './analytics.types';

export class AnalyticsRepository {
  db: any;
  constructor(db: any) { this.db = db; }

  async getDailyUsage(days = 7): Promise<DailyUsageStats[]> {
    // group by date (YYYY-MM-DD)
    const rows = await this.db.prepare(
      `SELECT substr(created_at,1,10) as date, COUNT(*) as requests, SUM(credits_used) as creditsUsed, SUM(cost_usd) as costUsd
       FROM ai_usage
       WHERE created_at >= datetime('now','-${days} days')
       GROUP BY date
       ORDER BY date ASC`
    ).all();
    return rows.map((r: any) => ({ date: r.date, requests: Number(r.requests||0), creditsUsed: Number(r.creditsUsed||0), costUsd: Number(r.costUsd||0) }));
  }

  async getServiceUsage(startDate?: string, endDate?: string): Promise<ServiceUsageStats[]> {
    let q = `SELECT service, COUNT(*) as requests, SUM(credits_used) as creditsUsed, SUM(cost_usd) as costUsd FROM ai_usage`;
    const params: any[] = [];
    if (startDate || endDate) {
      q += ' WHERE 1=1';
      if (startDate) { q += ' AND created_at >= ?'; params.push(startDate); }
      if (endDate) { q += ' AND created_at <= ?'; params.push(endDate); }
    }
    q += ' GROUP BY service ORDER BY creditsUsed DESC';
    const rows = await this.db.prepare(q).bind(...params).all();
    return rows.map((r:any) => ({ service: r.service, requests: Number(r.requests||0), creditsUsed: Number(r.creditsUsed||0), costUsd: Number(r.costUsd||0) }));
  }

  async getUserUsage(userId: string, startDate?: string, endDate?: string): Promise<UserUsageStats> {
    let q = `SELECT COUNT(*) as requests, SUM(credits_used) as creditsUsed, SUM(cost_usd) as costUsd FROM ai_usage WHERE user_id = ?`;
    const params: any[] = [userId];
    if (startDate) { q += ' AND created_at >= ?'; params.push(startDate); }
    if (endDate) { q += ' AND created_at <= ?'; params.push(endDate); }
    const row = await this.db.prepare(q).bind(...params).first();
    return { userId, requests: Number(row?.requests||0), creditsUsed: Number(row?.creditsUsed||0), costUsd: Number(row?.costUsd||0) };
  }

  async getTotalCost(): Promise<number> {
    const row = await this.db.prepare('SELECT SUM(cost_usd) as total FROM ai_usage').first();
    return Number(row?.total || 0);
  }

  async getTodayCounts(): Promise<{ todayRequests:number; todayCredits:number; todayCost:number; totalUsers:number }> {
    const today = new Date().toISOString().slice(0,10);
    const r1 = await this.db.prepare("SELECT COUNT(*) as requests, SUM(credits_used) as credits, SUM(cost_usd) as cost FROM ai_usage WHERE substr(created_at,1,10) = ?").bind(today).first();
    const r2 = await this.db.prepare('SELECT COUNT(DISTINCT user_id) as users FROM ai_usage').first();
    return { todayRequests: Number(r1?.requests||0), todayCredits: Number(r1?.credits||0), todayCost: Number(r1?.cost||0), totalUsers: Number(r2?.users||0) };
  }
}
