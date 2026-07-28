export class ConversationRepository {
  private db: any;

  constructor(env: any) {
    this.db = env.DB;
  }

  async insert(conversation: any): Promise<string> {
    const stmt = this.db.prepare(
      "INSERT INTO conversations (id, user_id, title, model, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    await stmt.run(
      conversation.id,
      conversation.userId,
      conversation.title || "",
      conversation.model || "",
      conversation.status,
      conversation.createdAt,
      conversation.updatedAt
    );
    return conversation.id;
  }

  async getByID(id: string): Promise<any | null> {
    const stmt = this.db.prepare("SELECT * FROM conversations WHERE id = ?");
    return await stmt.get(id);
  }

  async findByUser(userId: string, limit: number): Promise<any[]> {
    const stmt = this.db.prepare(
      "SELECT * FROM conversations WHERE user_id = ? AND status = ? ORDER BY updated_at DESC LIMIT ?"
    );
    return await stmt.all(userId, "active", limit);
  }

  async updateLastMessage(conversationId: string, updatedAt: string): Promise<void> {
    const stmt = this.db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?");
    await stmt.run(updatedAt, conversationId);
  }

  async updateStatus(conversationId: string, status: "active" | "archived" | "deleted"): Promise<void> {
    const stmt = this.db.prepare("UPDATE conversations SET status = ?, updated_at = datetime(\\\"now\\\") WHERE id = ?");
    await stmt.run(status, conversationId);
  }
}

export default ConversationRepository;

