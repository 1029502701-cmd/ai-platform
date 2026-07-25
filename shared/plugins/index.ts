import { manifest as beautyManifest } from '../../plugins/beauty/manifest';

export const pluginsRegistry: Record<string, any> = {
  [beautyManifest.id]: beautyManifest,
};

export function listPlugins() { return Object.values(pluginsRegistry); }
