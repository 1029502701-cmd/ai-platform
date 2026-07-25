export class BeautyRepository {
  constructor(db) {
    this.db = db;
  }

  async getProfile(userId) {
    const row = await this.db.prepare('SELECT * FROM beauty_profiles WHERE user_id = ? LIMIT 1').bind(userId).first();
    return row ?? null;
  }

  async createProfile(data) {
    const now = new Date().toISOString();
    await this.db.prepare('INSERT INTO beauty_profiles (id, user_id, avatar_url, current_face_shape, current_eye_shape, skin_info, preferred_style, favorite_colors, analysis_count, last_analysis_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(
        data.id,
        data.user_id,
        data.avatar_url || null,
        data.current_face_shape || null,
        data.current_eye_shape || null,
        data.skin_info || null,
        data.preferred_style || null,
        data.favorite_colors || null,
        data.analysis_count || 0,
        data.last_analysis_id || null,
        data.created_at || now,
        data.updated_at || now
      )
      .run();
    return await this.getProfile(data.user_id);
  }

  async updateProfile(userId, patch) {
    const now = new Date().toISOString();
    const sets = [];
    const params = [];
    for (const k of Object.keys(patch)) {
      sets.push(`${k} = ?`);
      params.push(patch[k]);
    }
    if (sets.length === 0) return await this.getProfile(userId);
    sets.push('updated_at = ?');
    params.push(now);
    params.push(userId);
    const q = `UPDATE beauty_profiles SET ${sets.join(', ')} WHERE user_id = ?`;
    await this.db.prepare(q).bind(...params).run();
    return await this.getProfile(userId);
  }

  async saveHistory(entry) {
    const now = new Date().toISOString();
    await this.db.prepare('INSERT INTO beauty_analysis_history (id, user_id, report_id, image_url, face_analysis_json, style_result, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(entry.id, entry.user_id, entry.report_id, entry.image_url || null, entry.face_analysis_json ? JSON.stringify(entry.face_analysis_json) : null, entry.style_result || null, entry.created_at || now)
      .run();
    return entry.id;
  }

  async getHistory(userId, options = {}) {
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const rows = await this.db.prepare('SELECT * FROM beauty_analysis_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(userId, limit, offset).all();
    return rows || [];
  }

  async listUserReports(userId) {
    const rows = await this.db.prepare('SELECT * FROM beauty_reports WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all();
    return rows || [];
  }
}
