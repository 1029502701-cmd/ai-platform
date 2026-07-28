// ============================================
// Shared Errors Package
// 统一的 API 错误处理
// ============================================

/**
 * API 标准错误码枚举
 */
export enum ErrorCode {
  // Authentication (1xxx)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Validation (2xxx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_PARAMS = 'INVALID_PARAMS',

  // Business (3xxx)
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  RATE_LIMITED = 'RATE_LIMITED',

  // External (4xxx)
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  PAYMENT_FAILED = 'PAYMENT_FAILED',

  // System (5xxx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * 标准 API 错误类
 */
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode?: number,
    metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode ?? this._codeToStatus(code);
    this.metadata = metadata;
  }

  private _codeToStatus(code: ErrorCode): number {
    switch (code) {
      case ErrorCode.UNAUTHORIZED:
      case ErrorCode.SESSION_EXPIRED: return 401;
      case ErrorCode.FORBIDDEN: return 403;
      case ErrorCode.VALIDATION_ERROR:
      case ErrorCode.INVALID_PARAMS: return 400;
      case ErrorCode.NOT_FOUND: return 404;
      case ErrorCode.RATE_LIMITED: return 429;
      case ErrorCode.PROVIDER_ERROR:
      case ErrorCode.PAYMENT_FAILED: return 502;
      default: return 500;
    }
  }

  /** 序列化后用于 API JSON 响应 */
  toJSON() {
    const obj: { success: false; error: Record<string, unknown> } = {
      success: false,
      error: { code: this.code, message: this.message },
    };
    if (this.metadata) {
      obj.error.metadata = this.metadata;
    }
    return obj;
  }
}

/** 快捷构造函数 */
export function unauthorized(msg = '未授权') {
  return new ApiError(ErrorCode.UNAUTHORIZED, msg, 401);
}
export function forbidden(msg = '权限不足') {
  return new ApiError(ErrorCode.FORBIDDEN, msg, 403);
}
export function notFound(resource = '资源') {
  return new ApiError(ErrorCode.NOT_FOUND, `${resource} 不存在`, 404);
}
export function validationError(msg = '参数校验失败') {
  return new ApiError(ErrorCode.VALIDATION_ERROR, msg, 400);
}
export function rateLimited(msg = '请求过于频繁，请稍后重试') {
  return new ApiError(ErrorCode.RATE_LIMITED, msg, 429);
}
export function internal(msg = '服务器内部错误') {
  return new ApiError(ErrorCode.INTERNAL_ERROR, msg, 500);
}
export function serviceUnavailable(msg = '服务暂时不可用') {
  return new ApiError(ErrorCode.SERVICE_UNAVAILABLE, msg, 503);
}
 -replace 'return new ApiError(ErrorCode.NOT_FOUND, \\ 不存在, 404);', 'return new ApiError(ErrorCode.NOT_FOUND, \\ 不存在\', 404);'
