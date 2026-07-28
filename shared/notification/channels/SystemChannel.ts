import type { NotificationProvider } from '../types';

export class SystemChannel {
  static readonly name = 'system';
  static readonly displayName = '系统通知';
  static readonly icon = '🔔';

  static render(content: string, variables: Record<string, any>): string {
    return content.replace(/\{\{(\w+)\}\g1\g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }
}
