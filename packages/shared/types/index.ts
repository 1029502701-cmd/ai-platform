// ============================================
// Shared Types Package
// 统一的项目类型定义
// ============================================

// ---------- API Response Types ----------

/** 标准 API 响应结构 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/** 标准 API 错误响应结构 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    metadata?: Record<string, unknown>;
  };
}

/** 联合类型：成功或失败 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/** 将任何 ResponseResult 转换为标准 API JSON body */
export function toApiResponse<T>(
  successData: T,
): ApiSuccessResponse<T>;
export function toApiResponse(
  error: { code: string; message: string },
): ApiErrorResponse;
export function toApiResponse<T>(value: T | { code: string; message: string }): ApiResponse<T> {
  if (typeof value === 'object' && 'code' in value && 'message' in value) {
    return { success: false, error: value as { code: string; message: string } };
  }
  return { success: true, data: value as T };
}

// ---------- API Context Types ----------

/** Cloudflare Pages Function 请求上下文（弱类型，替代 any） */
export interface RequestContext<Env = unknown> {
  request: Request;
  env: Env;
  params?: Record<string, string>;
  waitUntil?: (promise: Promise<unknown>) => void;
}

/** Authenticated 用户信息（从 session/guest 提取） */
export interface AuthUser {
  id: string;
  role: string;
  type: string;
  tenantId?: string;
}

/** 带有认证信息的扩展上下文 */
export interface AuthContext<Env = unknown> extends RequestContext<Env> {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

// ---------- Pagination Types ----------

/** 分页参数 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/** 分页结果 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

/** 默认分页 */
export function defaultPagination(page?: number, pageSize?: number): PaginationParams {
  return {
    page: Math.max(1, Math.floor(page || 1)),
    pageSize: Math.min(100, Math.max(1, Math.floor(pageSize || 20))),
  };
}

// ---------- Error Code Constants ----------

/** 标准 HTTP 状态码映射 */
export const HttpStatus = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/** 标准错误码列表 */
export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PARAMS: 'INVALID_PARAMS',

  // Business
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  RATE_LIMITED: 'RATE_LIMITED',

  // External
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PAYMENT_FAILED: 'PAYMENT_FAILED',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
