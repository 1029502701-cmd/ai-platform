import { PlanRepository } from './plan.repository';
import { BillingService } from './billing.service';

export class SubscriptionService {
  db: any;
  planRepo: PlanRepository;
  billing: BillingService;
  constructor(db: any) { this.db = db; this.planRepo = new PlanRepository(db); this.billing = new BillingService(db); }

  async createSubscription(userId: string, planId: string) {
    const plan = await this.planRepo.getPlan(planId);
    if (!plan) throw new Error('plan_not_found');
    const now = new Date();
    const start = now.toISOString();
    const expire = new Date(now.getTime() + (plan.duration_days||30)*24*60*60*1000).toISOString();
    const id = `sub_${Date.now().toString(36)}`;
    await this.db.prepare('INSERT INTO subscriptions (id,user_id,plan_id,start_time,expire_time,status,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,userId,planId,start,expire,'active',start).run();
    // grant credits
    const credits = plan.credits || 0;
    if (credits > 0) {
      await this.billing.refundCredits(userId, credits);
    }
    return { id, userId, planId, start, expire };
  }

  async getUserSubscription(userId: string) {
    const row = await this.db.prepare('SELECT * FROM subscriptions WHERE user_id = ? AND status = "active" ORDER BY created_at DESC LIMIT 1').bind(userId).first();
    return row ?? null;
  }

  async checkSubscription(userId: string) {
    const s = await this.getUserSubscription(userId);
    if (!s) return { active: false };
    const now = new Date().toISOString();
    if (s.expire_time < now) return { active: false }; 
    return { active: true, plan_id: s.plan_id, expire_time: s.expire_time };
  }
}
