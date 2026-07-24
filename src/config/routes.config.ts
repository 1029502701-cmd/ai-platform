/** Route path and label definition. */
export interface RouteDef {
  path: string;
  label: string;
  requiresAuth?: boolean;
}

export const ROUTES: RouteDef[] = [
  { path: "/", label: "首页", requiresAuth: false },
  { path: "/login", label: "登录", requiresAuth: false },
  { path: "/register", label: "注册", requiresAuth: false },
  { path: "/chat", label: "AI 聊天", requiresAuth: true },
  { path: "/pricing", label: "定价", requiresAuth: false },
  { path: "/admin/*", label: "管理后台", requiresAuth: true, },
];
