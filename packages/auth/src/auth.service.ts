import type { D1Database } from '@cloudflare/workers-types';
import { UserRepository } from './repositories/user';
import { SessionRepository } from './repositories/session';
import type { User, AuthenticatedUser, AuthenticatedSession } from '../types';

export interface AuthServiceConfig {
  db: D1Database;
  USER_CACHE: KVNamespace;
}

export class AuthService {
  private readonly userRepo: UserRepository;
  private readonly sessionRepo: SessionRepository;
  private readonly USER_CACHE: KVNamespace;

  constructor(config: AuthServiceConfig) {
    this.userRepo = new UserRepository({ db: config.db });
    this.sessionRepo = new SessionRepository({ db: config.db });
    this.USER_CACHE = config.USER_CACHE;
  }

  async createGuestUser(): Promise<{ user: User; sessionId: string; expiresAt: string }> {
    const user = await this.userRepo.createGuest();
    const { sessionId, expiresAt } = await this.sessionRepo.createSession(user.id);
    return { user, sessionId, expiresAt };
  }

  async loginGuest(userId: string): Promise<{ sessionId: string; expiresAt: string; user: User }> {
    const user = await this.userRepo.getById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    if (user.status !== 'active') throw new Error('USER_DISABLED');

    const { sessionId, expiresAt } = await this.sessionRepo.createSession(user.id);
    return { sessionId, expiresAt, user };
  }

  async getCurrentUser(sessionId: string): Promise<AuthenticatedSession | null> {
    return await this.sessionRepo.validateSession(sessionId);
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionRepo.revokeSession(sessionId);
  }
}
