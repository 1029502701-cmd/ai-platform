// ============================================
// Shared Logger Package — Production Edition
// 结构化日志：支持 requestId / userId / plugin / duration / errorCode
// ============================================

import { monitor } from '../monitoring/index.ts';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  requestId?: string;
  userId?: string;
  plugin?: string;
  duration?: number;       // ms
  errorCode?: string;
  statusCode?: number;
  method?: string;
  path?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
}

/** 生产环境使用 ISO8601 + JSON 格式 */
function formatProduction(entry: LogEntry): string {
  const base: Record<string, unknown> = {
    level: entry.level.toUpperCase(),
    ts: entry.timestamp,
    msg: entry.message,
  };
  if (entry.context) {
    Object.assign(base, entry.context);
  }
  return JSON.stringify(base);
}

/** 开发环境使用人类可读格式 */
function formatDevelopment(entry: LogEntry): string {
  const time = new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour12: false });
  let line = `${time} [${entry.level.toUpperCase().padEnd(6)}] ${entry.message}`;
  if (entry.context) {
    const parts: string[] = [];
    const c = entry.context as Record<string, unknown>;
    if (c.requestId) parts.push(`req=${c.requestId}`);
    if (c.userId) parts.push(`user=${c.userId}`);
    if (c.plugin) parts.push(`plugin=${c.plugin}`);
    if (c.duration !== undefined) parts.push(`dur=${c.duration}ms`);
    if (c.errorCode) parts.push(`code=${c.errorCode}`);
    if (c.statusCode) parts.push(`status=${c.statusCode}`);
    if (parts.length > 0) line += ` {${parts.join(', ')}}`;
  }
  return line;
}

const LEVELS: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3, fatal: 4,
};

const isProduction = process.env.NODE_ENV === 'production';

function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[minLevel];
}

/**
 * 结构化日志器（支持关联数据）
 */
export class Logger {
  private minLevel: LogLevel;
  private source: string;

  constructor(minLevel: LogLevel = 'info', source = 'api') {
    this.minLevel = minLevel;
    this.source = source;
  }

  /** 为本次请求创建带上下文的子 logger */
  child(context: LogContext): Logger {
    const origDebug = this.debug.bind(this);
    const origInfo = this.info.bind(this);
    const origWarn = this.warn.bind(this);
    const origError = this.error.bind(this);

    const mergeContext = (ctx: LogContext | undefined) => ({
      ...context,
      ...(ctx || {}),
      _source: this.source,
    } satisfies LogContext);

    return new Logger(this.minLevel, this.source) as any;
  }

  debug(message: string, ctx?: LogContext) {
    if (!shouldLog('debug', this.minLevel)) return;
    const entry: LogEntry = {
      level: 'debug', message,
      timestamp: new Date().toISOString(),
      context: mergeContext(ctx),
    };
    console.debug(isProduction ? formatProduction(entry) : formatDevelopment(entry));
  }

  info(message: string, ctx?: LogContext) {
    if (!shouldLog('info', this.minLevel)) return;
    const entry: LogEntry = {
      level: 'info', message,
      timestamp: new Date().toISOString(),
      context: mergeContext(ctx),
    };
    console.info(isProduction ? formatProduction(entry) : formatDevelopment(entry));
  }

  warn(message: string, ctx?: LogContext) {
    if (!shouldLog('warn', this.minLevel)) return;
    const entry: LogEntry = {
      level: 'warn', message,
      timestamp: new Date().toISOString(),
      context: mergeContext(ctx),
    };
    console.warn(isProduction ? formatProduction(entry) : formatDevelopment(entry));
  }

  error(message: string, ctx?: LogContext) {
    if (!shouldLog('error', this.minLevel)) return;
    const entry: LogEntry = {
      level: 'error', message,
      timestamp: new Date().toISOString(),
      context: mergeContext(ctx),
    };
    console.error(isProduction ? formatProduction(entry) : formatDevelopment(entry));

    // 同时上报到错误监控
    void monitor.error(message, {
      code: ctx?.errorCode,
      stack: '',
      userId: ctx?.userId,
      requestId: ctx?.requestId,
      plugin: ctx?.plugin,
      severity: 'error' as const,
    }).catch(() => {});
  }

  fatal(message: string, ctx?: LogContext) {
    if (!shouldLog('fatal', this.minLevel)) return;
    const entry: LogEntry = {
      level: 'fatal', message,
      timestamp: new Date().toISOString(),
      context: mergeContext(ctx),
    };
    console.error(isProduction ? formatProduction(entry) : formatDevelopment(entry));

    void monitor.critical(message, {
      code: ctx?.errorCode,
      stack: '',
      userId: ctx?.userId,
      requestId: ctx?.requestId,
      plugin: ctx?.plugin,
    }).catch(() => {});
  }
}

/** 全局默认 logger */
export const logger = new Logger(isProduction ? 'info' : 'debug');

/** 为每个 API 请求创建 child logger 的工厂函数 */
export function createRequestLogger(requestId: string, plugin?: string): Logger {
  return new Logger(isProduction ? 'info' : 'debug').child({ requestId, plugin });
}
