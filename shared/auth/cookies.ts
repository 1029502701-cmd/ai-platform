const SESSION_COOKIE = "__Host-session";
const SESSION_PATTERN = /^[A-Za-z0-9_-]{40,128}$/;

export function readSessionId(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) {
      continue;
    }

    const name = part.slice(0, separator).trim();
    if (name !== SESSION_COOKIE) {
      continue;
    }

    try {
      const value = decodeURIComponent(part.slice(separator + 1).trim());
      return SESSION_PATTERN.test(value) ? value : null;
    } catch {
      return null;
    }
  }

  return null;
}

export function createSessionCookie(
  sessionId: string,
  secure: boolean,
  maxAgeSeconds: number,
): string {
  const secureFlag = secure ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; SameSite=Lax${secureFlag}`;
}

export function clearSessionCookie(secure: boolean): string {
  return createSessionCookie("", secure, 0);
}
