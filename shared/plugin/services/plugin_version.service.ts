/**
 * PluginVersionService - Manages plugin version lifecycle and metadata
 */

import { PluginManifest, PluginStatus } from "../types";

export interface PluginVersion {
  pluginId: string;
  version: string;
  status: "draft" | "released" | "deprecated" | "unreleased";
  releaseNotes?: string;
  createdAt: string;
}

export class PluginVersionService {
  private versions = new Map<string, PluginVersion[]>(); // pluginId -> [versions]
  private latestVersionCache = new Map<string, string>(); // pluginId -> latest version

  constructor() {
    this.versions = new Map();
    this.latestVersionCache = new Map();
  }

  /**
   * Register a new plugin version
   */
  async registerVersion(
    pluginId: string,
    version: string,
    status: "draft" | "released" | "deprecated" = "draft",
    releaseNotes?: string
  ): Promise<PluginVersion> {
    const now = new Date().toISOString();
    const versionEntry: PluginVersion = {
      pluginId,
      version,
      status,
      releaseNotes,
      createdAt: now,
    };

    if (!this.versions.has(pluginId)) {
      this.versions.set(pluginId, []);
    }

    const versions = this.versions.get(pluginId)!;
    versions.push(versionEntry);

    // Sort versions semantically (simple alphabetical for now)
    versions.sort((a, b) => b.version.localeCompare(a.version));

    // Update cache if this is the highest version so far
    if (this.latestVersionCache.get(pluginId) !== version) {
      this.latestVersionCache.set(pluginId, version);
    }

    return versionEntry;
  }

  /**
   * Get all versions for a plugin
   */
  async getVersions(pluginId: string): Promise<PluginVersion[]> {
    return this.versions.get(pluginId) || [];
  }

  /**
   * Get the latest released version for a plugin
   */
  async getLatestVersion(pluginId: string): Promise<PluginVersion | null> {
    const versions = this.getVersions(pluginId);
    if (versions.length === 0) return null;

    // Find first released version (sorted descending)
    for (const v of versions) {
      if (v.status === "released") {
        return v;
      }
    }

    // If no released version, return the latest draft
    return versions[0];
  }

  /**
   * Compare two version strings
   * Returns: negative if v1 < v2, zero if equal, positive if v1 > v2
   */
  async compareVersion(v1: string, v2: string): number {
    // Simple semantic version comparison
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);

    const maxLength = Math.max(parts1.length, parts2.length);
    while (parts1.length < maxLength) parts1.push(0);
    while (parts2.length < maxLength) parts2.push(0);

    for (let i = 0; i < maxLength; i++) {
      if (parts1[i] < parts2[i]) return -1;
      if (parts1[i] > parts2[i]) return 1;
    }
    return 0;
  }

  /**
   * Get all unique plugin IDs that have versions registered
   */
  async getAllPluginIds(): Promise<string[]> {
    return Array.from(this.versions.keys());
  }

  /**
   * Set version status
   */
  async setStatus(pluginId: string, version: string, status: "draft" | "released" | "deprecated"): Promise<boolean> {
    const versions = this.versions.get(pluginId);
    if (!versions) return false;

    const versionEntry = versions.find((v) => v.version === version);
    if (!versionEntry) return false;

    versionEntry.status = status;
    return true;
  }

  /**
   * Get version details
   */
  async getVersion(pluginId: string, version: string): Promise<PluginVersion | null> {
    const versions = this.versions.get(pluginId);
    if (!versions) return null;

    return versions.find((v) => v.version === version) || null;
  }
}

export const versionService = new PluginVersionService();
