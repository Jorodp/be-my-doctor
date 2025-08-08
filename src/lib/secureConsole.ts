/* In production, disable verbose console methods to prevent accidental leaks.
   Use src/lib/logger for safe logging instead. */

if (import.meta.env.PROD) {
  const noop = () => {};
  try { (console as any).log = noop; } catch {}
  try { (console as any).debug = noop; } catch {}
  try { (console as any).trace = noop; } catch {}
}
