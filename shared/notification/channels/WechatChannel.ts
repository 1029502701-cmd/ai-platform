import type { NotificationProvider } from '../types';

export class WechatChannel {
  static readonly name = 'wechat';
  static readonly displayName = '微信通知';
  static readonly icon = '🤖';

  static render(content: string, variables: Record<string, any>): string {
    return content.replace(/\{\{(\w+)\}\g1\g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }
}
