import type { NotificationProvider } from '../types';

export class EmailChannel {
  static readonly name = 'email';
  static readonly displayName = '电子邮件';
  static readonly icon = '📧';

  static renderSubject(subject: string, variables: Record<string, any>): string {
    return subject ? this.render(subject, subject) : '';
  }

  static render(content: string, variables: Record<string, any>): string {
    return content.replace(/\{\{(\w+)\}\g1\g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }
}
