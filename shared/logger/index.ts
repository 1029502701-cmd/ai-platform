import type { LogEntry, LogLevel, LoggerOptions } from "./types";

const DEFAULT_LEVEL: LogLevel = "info";

const LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

export class Logger {
    private minLevel: LogLevel;
    private module: string;

    constructor(module: string, options?: LoggerOptions) {
        this.module = module;
        this.minLevel = options?.minLevel || DEFAULT_LEVEL;
    }

    private shouldLog(level: LogLevel): boolean {
        return LEVEL_ORDER[level] >= LEVEL_ORDER[this.minLevel];
    }

    log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
        if (!this.shouldLog(level)) return;
        const metaClean: Record<string, unknown> = {};
        if (meta) {
            for (const [k, v] of Object.entries(meta)) {
                if (/key|secret|token|password/i.test(k) && typeof v === "string") {
                    metaClean[k] = "***REDACTED***";
                } else {
                    metaClean[k] = v;
                }
            }
        }
        const levelUpper = level.toUpperCase();
        const bracket = String.fromCharCode(91) + String.fromCharCode(34);
        const closingBracket = String.fromCharCode(34) + String.fromCharCode(93);
        const modLabel = bracket + this.module + closingBracket;
        const levelLabel = String.fromCharCode(91) + levelUpper + String.fromCharCode(93);
        const parts = [new Date().toISOString(), levelLabel, modLabel, message];
        if (Object.keys(metaClean).length > 0) {
            parts.push(JSON.stringify(metaClean));
        }
        const formatted = parts.join(" ");
        if (level === "error") console.error(formatted);
        else if (level === "warn") console.warn(formatted);
        else console.log(formatted);
    }

    debug(message: string, meta?: Record<string, unknown>) { this.log("debug", message, meta); }
    info(message: string, meta?: Record<string, unknown>) { this.log("info", message, meta); }
    warn(message: string, meta?: Record<string, unknown>) { this.log("warn", message, meta); }
    error(message: string, meta?: Record<string, unknown>) { this.log("error", message, meta); }

    structuredLog(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
        if (!this.shouldLog(level)) return "";
        const metaClean: Record<string, unknown> = {};
        if (meta) {
            for (const [k, v] of Object.entries(meta)) {
                if (/key|secret|token|password/i.test(k) && typeof v === "string") {
                    metaClean[k] = "***REDACTED***";
                } else {
                    metaClean[k] = v;
                }
            }
        }
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            module: this.module,
            message,
            metadata: metaClean,
        });
    }
}

export function getLogger(moduleName: string, options?: LoggerOptions): Logger {
    return new Logger(moduleName, options);
}

// Re-exports for convenience
export { createRequestLogger, extractRequestMeta, logToDB } from "./requestLogger";

export type { LogEntry, LogLevel, LoggerOptions } from "./types";
