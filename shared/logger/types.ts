export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
    requestId?: string;
    timestamp: string;
    level: LogLevel;
    module: string;
    message: string;
    metadata?: Record<string, unknown>;
}

export interface LoggerOptions {
    minLevel?: LogLevel;
    includeTimestamp?: boolean;
    includeRequestId?: boolean;
}
