export type DailyUsageStats = {
  date: string; // YYYY-MM-DD
  requests: number;
  creditsUsed: number;
  costUsd: number;
};

export type ServiceUsageStats = {
  service: string;
  requests: number;
  creditsUsed: number;
  costUsd: number;
};

export type UserUsageStats = {
  userId: string;
  requests: number;
  creditsUsed: number;
  costUsd: number;
};

export type DashboardOverview = {
  todayRequests: number;
  todayCredits: number;
  todayCost: number;
  totalUsers: number;
};