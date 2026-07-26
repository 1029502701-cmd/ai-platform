/**
 * App Manifest SDK — defines how AI Apps are structured in the marketplace.
 */

export type AppCategory = 'beauty' | 'writing' | 'office' | 'education' | 'marketing' | 'coding' | 'image' | 'communication' | 'business' | 'utility';

export type AppEntryType = 'page' | 'api' | 'embed';

export type AppBillingType = 'free' | 'one-time' | 'subscription';

export interface AppManifest {
  id?: number;
  slug: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon?: string;
  category: AppCategory;
  permissions: string[];          // e.g., ['ai.generate', 'knowledge.read']
  entry: {
    type: AppEntryType;
    path?: string;              // for page entries
    endpoint?: string;          // for API entries
    embedUrl?: string;          // for embed entries
  };
  billing: {
    type: AppBillingType;
    priceCents?: number;
    planId?: string;
    trialDays?: number;
  };
  features: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AppInstallation {
  id?: number;
  userId: number;
  appSlug: string;
  version: string;
  settings: Record<string, unknown>;
  status: 'active' | 'inactive' | 'uninstalled';
  installedAt: string;
  updatedAt: string;
}

export interface AppUpdateAvailable {
  appSlug: string;
  currentVersion: string;
  latestVersion: string;
  changelog: string;
}

export interface AppReview {
  id?: number;
  userId: number;
  appSlug: string;
  rating: number;       // 1-5
  comment?: string;
  createdAt: string;
}