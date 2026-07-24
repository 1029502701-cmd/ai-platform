export class FeatureService {
  db: any;
  constructor(db: any) { this.db = db; }

  async checkFeature(userId: string, featureKey: string): Promise<boolean> {
    // find active subscription
    const sub = await this.db.prepare('SELECT plan_id, expire_time FROM subscriptions WHERE user_id = ? AND status = "active" ORDER BY created_at DESC LIMIT 1').bind(userId).first();
    if (!sub) return false;
    // if expired
    const now = new Date().toISOString();
    if (sub.expire_time < now) return false;
    const feat = await this.db.prepare('SELECT feature_value FROM plan_features WHERE plan_id = ? AND feature_key = ? LIMIT 1').bind(sub.plan_id, featureKey).first();
    if (!feat) return false;
    // interpret boolean-like strings
    const v = feat.feature_value;
    if (v === 'true' || v === '1') return true;
    if (!isNaN(Number(v))) return Number(v) > 0;
    return false;
  }
}
