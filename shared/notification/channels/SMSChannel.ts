import type { NotificationProvider } from '../types';

export class SMSChannel {
  static readonly name = 'sms';
  static readonly displayName = '短信通知';
  static readonly icon = '📱';

  static render(content: string, variables: Record<string, any>): string {
    // SMS has length constraints, truncate if needed
    let result = content.replace(/\{\{(\w+)\}\g1\g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
    return result.substring(0, 160); // SMS limit
  }
}
