/**
 * Beauty AI Agent helpers — provide simple biasing logic based on user profile
 * This intentionally keeps logic lightweight and deterministic for tests.
 */

export function applyUserProfileBias(report: any, userProfile?: any): string {
  if (!userProfile) return report?.makeup?.base || '';
  try {
    // Prefer explicit preferred_style
    if (userProfile.preferred_style) {
      report.makeup = report.makeup || {};
      report.makeup.base = userProfile.preferred_style;
      return `preferred:${userProfile.preferred_style}`;
    }

    // Fallback: if favorite_colors includes warm tones, bias lip color
    if (userProfile.favorite_colors && typeof userProfile.favorite_colors === 'string') {
      const colors = userProfile.favorite_colors.split(',').map((s: string) => s.trim().toLowerCase());
      if (colors.includes('coral') || colors.includes('pink') || colors.includes('rose')) {
        report.makeup = report.makeup || {};
        report.makeup.lipColor = 'coral';
        return `color_bias:coral`;
      }
    }

    // Fallback to last style if present
    if (userProfile.last_style) {
      report.makeup = report.makeup || {};
      report.makeup.base = userProfile.last_style;
      return `last_style:${userProfile.last_style}`;
    }
  } catch (e) {
    // ignore errors — return default
  }
  return report?.makeup?.base || '';
}
