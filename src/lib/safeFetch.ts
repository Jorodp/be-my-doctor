import logger from './logger';

export async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(input, init);
    if (!res.ok) {
      logger.warn('Fetch non-OK response', { url: typeof input === 'string' ? input : input.toString(), status: res.status });
    }
    return res;
  } catch (e: any) {
    logger.error('Fetch failed', { url: typeof input === 'string' ? input : input.toString(), message: e?.message });
    throw e;
  }
}
