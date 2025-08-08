/* Centralized secure logger with redaction */

// Redaction helpers
const SENSITIVE_KEYS = [
  'authorization', 'auth', 'token', 'access_token', 'refresh_token', 'password',
  'service_role', 'service_role_key', 'api_key', 'apikey', 'secret', 'bearer'
];

const redactString = (input: string): string => {
  let out = input;
  // Bearer tokens
  out = out.replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
  // Key/value patterns like access_token: "..." or access_token=...
  out = out.replace(/(access_token|refresh_token|password|service_role|api[_-]?key|secret)\s*[:=]\s*"?[A-Za-z0-9_\-\.]+"?/gi, '$1: [REDACTED]');
  return out;
};

const redactValue = (value: any): any => {
  if (value == null) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(redactValue);

  if (typeof value === 'object') {
    const copy: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.includes(k.toLowerCase())) {
        copy[k] = '[REDACTED]';
      } else {
        copy[k] = redactValue(v);
      }
    }
    return copy;
  }
  return value;
};

const shouldLogInfo = () => !import.meta.env.PROD;

const serialize = (args: any[]): any[] => args.map(a => redactValue(a));

export const logger = {
  info: (...args: any[]) => {
    if (!shouldLogInfo()) return; // In prod, suppress info
    try {
      // eslint-disable-next-line no-console
      console.warn('[INFO]', ...serialize(args));
    } catch {
      // noop
    }
  },
  warn: (...args: any[]) => {
    try {
      // eslint-disable-next-line no-console
      console.warn('[WARN]', ...serialize(args));
    } catch {
      // noop
    }
  },
  error: (...args: any[]) => {
    try {
      // eslint-disable-next-line no-console
      console.error('[ERROR]', ...serialize(args));
    } catch {
      // noop
    }
  },
};

export default logger;
