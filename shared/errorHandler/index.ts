import { getLogger } from "../logger";

const log = getLogger("errorHandler");

/**
 * Standardized error response format for all API routes.
 */
export interface ApiError {
    code: string;
    message: string;
    statusCode: number;
}

/**
 * Wrap an error into a standardized response body.
 * In production, stack traces and internal details are NEVER exposed.
 */
export function createErrorResponse(
    error: unknown,
    requestId?: string
): { success: false; error: ApiError; meta: { requestId?: string } } {
    const isDev = process.env?.NODE_ENV === "development";

    let code = "INTERNAL_ERROR";
    let message = "Server internal error";
    let statusCode = 500;

    if (error instanceof Error) {
        // Extract meaningful message from known error types
        const msg = error.message || "";
        if (msg.includes("UNAUTHORIZED") || msg.includes("401")) {
            code = "AUTH_FAILED";
            message = "Authentication failed";
            statusCode = 401;
        } else if (msg.includes("FORBIDDEN") || msg.includes("403")) {
            code = "ACCESS_DENIED";
            message = "Access denied";
            statusCode = 403;
        } else if (msg.includes("NOT_FOUND") || msg.includes("404")) {
            code = "RESOURCE_NOT_FOUND";
            message = "Resource not found";
            statusCode = 404;
        } else if (msg.includes("DUPLICATE") || msg.includes("UNIQUE")) {
            code = "DUPLICATE_ENTRY";
            message = "This resource already exists";
            statusCode = 409;
        } else if (msg.includes("QUOTA") || msg.includes("LIMIT") || msg.includes("429")) {
            code = "RATE_LIMITED";
            message = "Too many requests, please try again later";
            statusCode = 429;
        } else if (isDev) {
            code = "ERROR_" + Date.now();
            message = msg;
            statusCode = 500;
        } else {
            // Production: never expose internal error details
            code = "INTERNAL_ERROR";
            message = "Service unavailable. Please try again later.";
            statusCode = 500;
        }
    }

    // Log full details internally
    if (!isDev && error instanceof Error) {
        log.error("API Error", {
            code,
            originalMessage: error instanceof Error ? (error.message || String(error)) : String(error),
            stack: error.stack || "",
            requestId,
        });
    }

    return {
        success: false,
        error: { code, message, statusCode },
        meta: { requestId },
    };
}

/**
 * Send a JSON error response with standard headers.
 */
export function sendErrorResponse(
    requestId: string,
    error: ApiError
): Response {
    return new Response(
        JSON.stringify({
            success: false,
            data: null,
            error,
            meta: { requestId, timestamp: new Date().toISOString() },
        }),
        {
            status: error.statusCode,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "X-Request-Id": requestId,
            },
        }
    );
}

/**
 * Sanitize error message for safe public exposure.
 */
export function sanitizeError(message: string): string {
    const dev = process.env?.NODE_ENV === "development";
    if (dev) return message;
    // Redact any DB/connection/provider key info
    return message.replace(/\b(key|token|secret|password|connection|string|host)\b[^.]*\./gi, "***");
}

/**
 * Format a consistent error response body.
 */
export function formatErrorBody(
    requestId: string,
    statusCode: number,
    code: string,
    message: string
): { success: boolean; data: null; error: ApiError; meta: Record<string, unknown> } {
    return {
        success: false,
        data: null,
        error: { code, message, statusCode },
        meta: { requestId, timestamp: new Date().toISOString() },
    };
}