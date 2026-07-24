import { AnalyticsRepository } from './analytics.repository';
import type { DashboardOverview, ServiceUsageStats } from './analytics.types';

export class AnalyticsService {
  repo: AnalyticsRepository;
  constructor(db: any) { this.repo = new AnalyticsRepository(db); }

  async getDashboardOverview(): Promise<DashboardOverview> {
    const s = await this.repo.getTodayCounts();
    return { todayRequests: s.todayRequests, todayCredits: s.todayCredits, todayCost: s.todayCost, totalUsers: s.totalUsers };
  }

  async getServiceRanking(): Promise<ServiceUsageStats[]> {
    return await this.repo.getServiceUsage();
  }

  async getCostReport(): Promise<{ totalCost: number; byDay: any[] }> {
    const total = await this.repo.getTotalCost();
    const byDay = await this.repo.getDailyUsage(30);
    return { totalCost: total, byDay };
  }
}
