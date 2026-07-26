export interface UserProfile {
  userId: string;
  email: string;
  role: "user" | "admin" | "super_admin";
  status: "active" | "suspended" | "deleted";
  displayName: string | null;
  avatarUrl: string | null;
  imageUrl?: string | null;
  lastAnalysisImage?: string | null;
  locale: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpdateInput {
  displayName?: string | null;
  avatarUrl?: string | null;
  imageUrl?: string | null;
  lastAnalysisImage?: string | null;
  locale?: string;
  timezone?: string;
}
