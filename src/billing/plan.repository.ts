export class PlanRepository {
  db: any;
  constructor(db: any) { this.db = db; }

  async getPlan(planId: string) {
    const row = await this.db.prepare('SELECT * FROM plans WHERE id = ?').bind(planId).first();
    return row ?? null;
  }

  async listPlans() {
    const rows = await this.db.prepare('SELECT * FROM plans WHERE enabled = 1').all();
    return rows || [];
  }

  async createPlan(p: { id:string; name:string; price:number; credits:number; duration_days:number }) {
    const now = new Date().toISOString();
    await this.db.prepare('INSERT INTO plans (id,name,price,credits,duration_days,enabled,created_at) VALUES (?,?,?,?,?,?,?)').bind(p.id,p.name,p.price,p.credits,p.duration_days,1,now).run();
    return await this.getPlan(p.id);
  }

  async updatePlan(planId:string, patch: any) {
    const sets = [] as string[];
    const params:any[] = [];
    for (const k of Object.keys(patch)) { sets.push(`${k} = ?`); params.push((patch as any)[k]); }
    params.push(planId);
    const q = `UPDATE plans SET ${sets.join(',')} WHERE id = ?`;
    await this.db.prepare(q).bind(...params).run();
    return await this.getPlan(planId);
  }

  async disablePlan(planId:string) {
    await this.db.prepare('UPDATE plans SET enabled = 0 WHERE id = ?').bind(planId).run();
    return true;
  }

  async getPlanFeatures(planId: string) {
    const rows = await this.db.prepare('SELECT feature_key, feature_value FROM plan_features WHERE plan_id = ?').bind(planId).all();
    return rows || [];
  }
}
