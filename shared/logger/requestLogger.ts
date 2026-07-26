import { Logger } from "./index";
import type { LogLevel } from "./types";

export function extractRequestMeta(context: {
    request: Request;
}): Record<string, unknown> {
    const url = new URL(context.request.url);
    return {
        method: context.request.method,
        path: url.pathname + url.search,
        ip: context.request.headers.get("CF-Connecting-IP") || "unknown",
        cfRay: context.request.headers.get("CF-Ray") || null,
        userAgent: context.request.headers.get("User-Agent") || null,
    };
}

export function createRequestLogger(
    requestId: string,
    module: string,
    contextMeta?: Record<string, unknown>
): Logger {
    const baseMeta = { requestId, ...(contextMeta || {}) };
    const logger = new Logger(module, {});

    const withId = (meta?: Record<string, unknown>) => {
        if (meta) {
            return { ...baseMeta, ...meta };
        }
        return { ...baseMeta };
    };

    const origInfo = logger.info.bind(logger);
    const origError = logger.error.bind(logger);
    const origWarn = logger.warn.bind(logger);
    const origDebug = logger.debug.bind(logger);

    logger.info = (msg, meta?) => origInfo(msg, withId(meta));
    logger.error = (msg, meta?) => origError(msg, withId(meta));
    logger.warn = (msg, meta?) => origWarn(msg, withId(meta));
    logger.debug = (msg, meta?) => origDebug(msg, withId(meta));

    return logger;
}

/**
 * Log a response to the monitoring table via DB.
 */
export async function logToDB(
    db: any,
    entry: Omit<any, "id"> & { id?: number }
): Promise<void> {
    try {
        const stmt = db.prepare(
            "INSERT INTO system_logs (request_id, level, module, message, metadata) VALUES (?, ?, ?, ?, ?)"
        );
        await stmt.run(
            entry.requestId || entry.request_id,
            entry.level,
            entry.module,
            entry.message,
            entry.metadata ? JSON.stringify(entry.metadata) : null
        ).catch(() => {});
    } catch {
        // Silently fail — logging must never break the app
    }
}