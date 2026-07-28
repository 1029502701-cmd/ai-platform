export class MessageRepository {
  private db: any;

  constructor(env: any) {
    this.db = env.DB;
  }

  async insert(message: any): Promise<string> {
    const stmt = this.db.prepare(
      "INSERT INTO messages (id, conversation_id, role, content, tokens, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    );
    await stmt.run(
      message.id,
      message.conversationId,
      message.role,
      message.content,
      message.tokens || 0,
      message.createdAt
    );
    return message.id;
  }

  async findByConversation(conversationId: string, limit: number): Promise<any[]> {
    const stmt = this.db.prepare(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?"
    );
    return await stmt.all(conversationId, limit);
  }

  async deleteLast(conversationId: string): Promise<void> {
    const stmt = this.db.prepare(
      "DELETE FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1"
    );
    await stmt.run(conversationId);
  }
}

export default MessageRepository;

