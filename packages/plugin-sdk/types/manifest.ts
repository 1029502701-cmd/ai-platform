import { PluginManifest } from '../../shared/plugin/types';

export type PluginSDKManifest = Omit<PluginManifest, 'capabilities'> & {
  id: string;
  name: string;
  version: string;
  description: string;
  author: { name: string; email?: string; url?: string; };
  category: string;
  permissions: string[];
  events: { name: string; description: string; schema?: Record<string, unknown>; }[];
  metrics: { name: string; description: string; type: 'counter' | 'gauge' | 'histogram'; unit: 'count' | 'bytes' | 'ms' | 'percent'; }[];
  dependencies?: Record<string, string>;
};

export function validateManifest(manifest: unknown): asserts manifest is PluginSDKManifest {
  if (!manifest || typeof manifest !== 'object' || manifest === null) {
    throw new Error('Manifest must be an object');
  }
  const m = manifest as Record<string, unknown>;
  const requiredFields = ['id', 'name', 'version', 'description', 'author', 'category', 'permissions'];
  for (const field of requiredFields) {
    if (!(field in m)) {
      throw new Error('Missing required field: ' + field);
    }
  }
  if (typeof m.id !== 'string' || m.id.trim() === '') throw new Error('Manifest id must be a non-empty string');
  if (typeof m.name !== 'string' || m.name.trim() === '') throw new Error('Manifest name must be a non-empty string');
  if (typeof m.version !== 'string') throw new Error('Manifest version must be a string');
  if (typeof m.description !== 'string') throw new Error('Manifest description must be a string');
  if (!m.author || typeof m.author !== 'object' || !('name' in m.author)) throw new Error('Manifest author must be an object with name field');
  if (typeof m.category !== 'string') throw new Error('Manifest category must be a string');
  if (!Array.isArray(m.permissions) || m.permissions.some(p => typeof p !== 'string')) throw new Error('Manifest permissions must be an array of strings');
}
