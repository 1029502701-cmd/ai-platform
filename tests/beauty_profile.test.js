import assert from 'assert';

// Minimal in-memory mock DB for repository tests
class MockDB {
  constructor() {
    this.profiles = [];
    this.history = [];
    this.reports = [];
  }

  prepare(sql) {
    const self = this;
    return {
      bind: (...args) => ({
        run: async () => {
          // INSERT INTO beauty_profiles
          if (sql.startsWith('INSERT INTO beauty_profiles')) {
            const [id, user_id, avatar_url, current_face_shape, current_eye_shape, skin_info, preferred_style, favorite_colors, analysis_count, last_analysis_id, created_at, updated_at] = args;
            self.profiles.push({ id, user_id, avatar_url, current_face_shape, current_eye_shape, skin_info, preferred_style, favorite_colors, analysis_count, last_analysis_id, created_at, updated_at });
            return { changes: 1 };
          }
          if (sql.startsWith('INSERT INTO beauty_analysis_history')) {
            const [id, user_id, report_id, image_url, face_analysis_json, style_result, created_at] = args;
            self.history.push({ id, user_id, report_id, image_url, face_analysis_json, style_result, created_at });
            return { changes: 1 };
          }
          if (sql.startsWith('INSERT OR REPLACE INTO beauty_reports') || sql.startsWith('INSERT INTO beauty_reports')) {
            const [id, user_id, report_json, created_at, updated_at] = args;
            self.reports.push({ id, user_id, report_json, created_at, updated_at });
            return { changes: 1 };
          }
          if (sql.startsWith('UPDATE beauty_profiles')) {
            // handle preferred_style update
            const [val1, val2, user_id] = args;
            const p = self.profiles.find(x => x.user_id === user_id);
            if (p) {
              // naive: if two params then assume (preferred_style, updated_at, user_id) or different order
              if (sql.includes('preferred_style')) p.preferred_style = val1;
              if (sql.includes('analysis_count')) p.analysis_count = (p.analysis_count || 0) + 1;
            }
            return { changes: 1 };
          }
          return { changes: 0 };
        },
        first: async () => {
          // SELECT existing profile
          if (sql.startsWith('SELECT * FROM beauty_profiles')) {
            const [userId] = args;
            return self.profiles.find(p => p.user_id === userId) || null;
          }
          if (sql.startsWith('SELECT id, analysis_count FROM beauty_profiles')) {
            const [userId] = args;
            return self.profiles.find(p => p.user_id === userId) || null;
          }
          return null;
        },
        all: async () => {
          if (sql.startsWith('SELECT * FROM beauty_analysis_history')) {
            const [userId, limit, offset] = args;
            return self.history.filter(h => h.user_id === userId).slice(offset, offset + limit);
          }
          if (sql.startsWith('SELECT * FROM beauty_reports')) {
            const [userId] = args;
            return self.reports.filter(r => r.user_id === userId);
          }
          return [];
        }
      })
    };
  }
}

(async () => {
  try {
    const mockDb = new MockDB();
    // import repository dynamically from compiled source
    const { BeautyRepository } = await import('../database/beauty_repository.js');
    const repo = new BeautyRepository(mockDb);

    // Create profile
    const profileId = 'bp_test';
    await repo.createProfile({ id: profileId, user_id: 'user_test', avatar_url: null, current_face_shape: 'oval', current_eye_shape: 'almond', skin_info: 'normal', preferred_style: 'natural', favorite_colors: 'coral,pink', analysis_count: 1, last_analysis_id: null });
    const p = await repo.getProfile('user_test');
    assert(p && p.user_id === 'user_test', 'profile created');

    // Update profile
    await repo.updateProfile('user_test', { preferred_style: 'glossy' });
    const p2 = await repo.getProfile('user_test');
    assert(p2 && p2.preferred_style === 'glossy', 'profile updated');

    // Save history
    const hid = 'hist1';
    await repo.saveHistory({ id: hid, user_id: 'user_test', report_id: 'r1', image_url: '/api/apps/beauty/image?key=test', face_analysis_json: { foo: 'bar' }, style_result: 'natural' });
    const h = await repo.getHistory('user_test', { limit: 10, offset: 0 });
    assert(Array.isArray(h) && h.length === 1, 'history saved');

    // list reports
    await mockDb.prepare('INSERT INTO beauty_reports (id, user_id, report_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind('r1', 'user_test', '{}', new Date().toISOString(), new Date().toISOString()).run();
    const reports = await repo.listUserReports('user_test');
    assert(Array.isArray(reports) && reports.length >= 1, 'report listed');

    console.log('Beauty profile repository tests passed');
    process.exit(0);
  } catch (e) {
    console.error('Test failed', e);
    process.exit(2);
  }
})();
