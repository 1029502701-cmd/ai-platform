/**
 * Beauty Repository (Migration Adapter)
 * Stub for pre-migration BeautyRepository usage.
 * Real implementation requires D1 table queries.
 */

export class BeautyRepository {
  private db: any;

  constructor(db?: any) {
    this.db = db;
  }

  async getProfile(userId: string): Promise<unknown> {
    console.warn("BeautyRepository.getProfile: stub");
    return null;
  }

  async saveReport(report: unknown): Promise<void> {
    console.warn("BeautyRepository.saveReport: stub");
  }

  async listUserReports(userId: string): Promise<unknown[]> {
    console.warn("BeautyRepository.listUserReports: stub");
    return [];
  }

  async getHistory(userId: string, _opts?: { limit?: number; offset?: number }): Promise<unknown[]> {
    console.warn("BeautyRepository.getHistory: stub");
    return [];
  }
}
