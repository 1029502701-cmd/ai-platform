/**
 * Reusable secret manager — reads from Cloudflare environment variables.
 * Never stores secrets in code or database.
 */

const SECRET_NAMES = [
  'OPENAI_API_KEY',
  'DEEPSEEK_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_AI_API_KEY',
  'JWT_SECRET',
  'WECHAT_APP_ID',
  'WECHAT_APP_SECRET',
  'STRIPE_SECRET_KEY',
  'BILLING_WEBHOOK_SECRET',
] as const;

type SecretName = typeof SECRET_NAMES[number];

export class SecretManager {
  /**
   * Get a secret by name from env vars.
   * Returns undefined if not set. NEVER returns the value in logs.
   */
  static get(env: any, name: SecretName): string | undefined {
    const val = (env as Record<string, string>)[name];
    return val && val.length > 0 ? val : undefined;
  }

  /**
   * Check if a secret is configured.
   */
  static isConfigured(env: any, name: SecretName): boolean {
    return !!(this.get(env, name));
  }

  /**
   * List all configured secrets with masked values.
   * Example: OPENAI_API_KEY → sk-****
   */
  static listMasked(env: any): Record<SecretName, boolean> {
    const result: Record<SecretName, boolean> = {} as any;
    for (const name of SECRET_NAMES) {
      result[name] = this.isConfigured(env, name);
    }
    return result;
  }

  /**
   * Get a secret that must exist, throws if not configured.
   */
  static require(env: any, name: SecretName): string {
    const val = this.get(env, name);
    if (!val) throw new Error(`Missing required secret: ${name}`);
    return val;
  }
}

// Pre-configured provider keys
export function getOpenAIApiKey(env: any): string | undefined {
  return SecretManager.get(env, 'OPENAI_API_KEY');
}

export function getDeepSeekApiKey(env: any): string | undefined {
  return SecretManager.get(env, 'DEEPSEEK_API_KEY');
}

export function getAnthropicApiKey(env: any): string | undefined {
  return SecretManager.get(env, 'ANTHROPIC_API_KEY');
}

export function getGoogleAIApiKey(env: any): string | undefined {
  return SecretManager.get(env, 'GOOGLE_AI_API_KEY');
}

export function getJwtSecret(env: any): string {
  return SecretManager.require(env, 'JWT_SECRET');
}