/**
 * Display-side redaction for audit log "changes" (Phase 07).
 *
 * Production audit_log rows still contain plain-text passwords from older
 * change-password requests (Phase 06 finding). Until the database is
 * cleaned, the admin audit page must never show the value of a key that
 * looks like a secret, at any nesting level.
 */
export const REDACTED = '[REDACTED]';

/** password, token, secret, apikey / api_key (also api-key), authorization; case-insensitive. */
const SECRET_KEY_PATTERN = /password|token|secret|api[-_]?key|authorization/i;

const MAX_DEPTH = 20;

export function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

/**
 * Deep copy of `value` in which the value of every secret-looking key is
 * replaced by "[REDACTED]" (objects and arrays at any depth). The input is
 * never modified. Circular references and nesting deeper than 20 levels
 * are replaced by "[REDACTED]" too, so nothing slips through unchecked.
 */
export function redactSecrets<T>(value: T): T {
  return redact(value, 0, new WeakSet<object>()) as T;
}

function redact(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (depth >= MAX_DEPTH || seen.has(value)) {
    return REDACTED;
  }
  seen.add(value);
  let result: unknown;
  if (Array.isArray(value)) {
    result = value.map((item) => redact(item, depth + 1, seen));
  } else {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSecretKey(key) ? REDACTED : redact(item, depth + 1, seen);
    }
    result = out;
  }
  seen.delete(value);
  return result;
}
