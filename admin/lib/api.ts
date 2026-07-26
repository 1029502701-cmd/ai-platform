// Admin Center — API client helper

interface RequestOptions extends RequestInit {
  adminOnly?: boolean;
}

async function request<T>(url: string, opts?: RequestOptions): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) {
    throw new Error(HTTP : );
  }
  return res.json() as Promise<{ success: boolean; data?: T; error?: string; meta: Record<string, unknown> }>;
}

export const api = {
  dashboard: {
    stats: () => request<{ success: boolean; data: import('../types').DashboardStats; error: null; meta: Record<string, unknown>}>(
      '/api/admin/dashboard/stats'
    ).then(r => r.data),
  },

  users: {
    list: (filters?: { type?: string; status?: string; search?: string }) => {
      const params = new URLSearchParams();
      if (filters?.type) params.set('type', filters.type);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);
      return request<import('../types').AdminUserItem[]>(/api/admin/users?).then(r => r.data || []);
    },
    detail: (userId: string) => request<import('../types').AdminUserItem>(/api/admin/users/).then(r => r.data),
    updateRole: (userId: string, role: string) => request<null>(/api/admin/users//role, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    }),
    suspend: (userId: string, suspended: boolean) => request<null>(/api/admin/users//suspend, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended }),
    }),
  },

  models: {
    list: () => request<import('../types').AdminModelItem[]>('/api/admin/models/list').then(r => r.data || []),
    toggleStatus: (modelId: string, enabled: boolean) => request<null>('/api/admin/models/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId, enabled }),
    }),
  },

  tasks: {
    list: (page = 1, pageSize = 50, status?: string) => {
      const p = new URLSearchParams({ page: String(page), size: String(pageSize) });
      if (status) p.set('status', status);
      return request<import('../types').AdminTaskItem[]>(/api/admin/tasks/list?).then(r => r.data || []);
    },
    detail: (taskId: string) => request<import('../types').AdminTaskItem>(/api/admin/tasks/).then(r => r.data),
    stats: () => request<{ success: boolean; data: Record<string, number>; error: null; meta: Record<string, unknown>}>(
      '/api/admin/tasks/stats'
    ).then(r => r.data),
  },

  billing: {
    overview: () => request<{ success: boolean; data: any; error: null; meta: Record<string, unknown>}>(
      '/api/admin/billing/overview'
    ).then(r => r.data),
    transactions: (page = 1) => request<import('../types').AdminTransactionItem[]>(/api/admin/billing/transactions?page=).then(r => r.data || []),
    wallets: (limit = 100) => request<import('../types').AdminWalletItem[]>(/api/admin/billing/wallets?limit=).then(r => r.data || []),
  },

  system: {
    providers: () => request<any[]>('/api/admin/system/providers').then(r => r.data || []),
    config: () => request<any>('/api/admin/system/config').then(r => r.data),
    updateConfig: (key: string, value: any) => request<null>('/api/admin/system/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    }),
  },
};
