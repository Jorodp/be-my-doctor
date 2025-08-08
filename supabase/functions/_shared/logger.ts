export const SENSITIVE_KEYS = [
  'authorization', 'auth', 'token', 'access_token', 'refresh_token', 'password',
  'service_role', 'service_role_key', 'api_key', 'apikey', 'secret', 'bearer'
];

const redactString = (input: string): string => {
  let out = input;
  out = out.replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
  out = out.replace(/(access_token|refresh_token|password|service_role|api[_-]?key|secret)\s*[:=]\s*"?[^"\s]+"?/gi, '$1: [REDACTED]');
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
      if (SENSITIVE_KEYS.includes(k.toLowerCase())) copy[k] = '[REDACTED]';
      else copy[k] = redactValue(v);
    }
    return copy;
  }
  return value;
};

const allowInfo = () => (Deno.env.get('ENV') || '').toLowerCase() !== 'production';

const serialize = (args: any[]) => args.map(redactValue);

export const logger = {
  info: (...args: any[]) => {
    if (!allowInfo()) return;
    // eslint-disable-next-line no-console
    console.warn('[INFO]', ...serialize(args));
  },
  warn: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.warn('[WARN]', ...serialize(args));
  },
  error: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.error('[ERROR]', ...serialize(args));
  },
};

export const safeError = (hint: string = 'Internal error') =>
  new Response(JSON.stringify({ error: 'Internal error', hint }), {
    status: 500,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
