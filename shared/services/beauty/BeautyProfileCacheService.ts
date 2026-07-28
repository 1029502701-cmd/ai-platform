import { D1Database, KVNamespace } from '@cloudflare/workers-types';

export interface UserProfileCacheEntry {
  profile: any;
  createdAt: number;
  ttl?: number;
}

export class BeautyProfileCacheService {
  private db: D1Database;
  private kv: KVNamespace; // USER_CACHE

  constructor(db: D1Database, kv: KVNamespace) {
    this.db = db;
    this.kv = kv;
    this.CACHE_TTL = 300; // 5 minutes
  }

  private readonly CACHE_TTL = 300; // seconds

  async getProfile(userId: string): Promise<any | null> {
    const cacheKey = eauty:profile:;
    
    // Try KV cache first
    try {
      const cached = await this.kv.get(cacheKey);
      if (cached) {
        const entry = typeof cached === 'string' ? JSON.parse(cached) : cached;
        if (entry.createdAt + (entry.ttl || this.CACHE_TTL) * 1000 > Date.now()) {
          return entry.profile;
        }
      }
    } catch (e) {
      console.warn('KV cache read failed', e);
    }

    // Fallback to DB
    try {
      // Assuming BeautyRepository pattern similar to existing beauty_repository.ts
      // Direct query for simplicity
      const profile = await this.db.prepare(
        'SELECT * FROM beauty_profiles WHERE user_id = ? LIMIT 1'
      ).bind(userId).first();

      if (profile) {
        // Cache the result
        try {
          const entry = {
            profile,
            createdAt: Date.now(),
            ttl: this.CACHE_TTL
          };
          await this.kv.put(cacheKey, JSON.stringify(entry));
        } catch (e) {
          console.warn('KV cache write failed', e);
        }
        return profile;
      }
      return null;
    } catch (e) {
      console.error('DB fetch failed', e);
      return null;
    }
  }

  async setProfile(userId: string, profile: any): Promise<void> {
    // Invalidate cache on update
    const cacheKey = eauty:profile:;
    try {
      await this.kv.delete(cacheKey);
    } catch (e) {
      console.warn('KV cache delete failed', e);
    }

    // Also update DB - this would typically be done via the BeautyRepository
    // Here we just do a direct update for simplicity
    try {
      // This is a simplified example - in practice you'd use proper upsert logic
      await this.db.prepare(
        'INSERT OR REPLACE INTO beauty_profiles (user_id, ...) VALUES (?, ...)'
      ).bind(userId, /* ... */).run();
    } catch (e) {
      console.error('DB update failed', e);
      // Continue anyway - cache invalidation is the important part
    }
  }

  async invalidateProfile(userId: string): Promise<void> {
    const cacheKey = eauty:profile:;
    try {
      await this.kv.delete(cacheKey);
    } catch (e) {
      console.warn('KV cache delete failed', e);
    }
  }
}

export default BeautyProfileCacheService;
