type Entry = { v: unknown; exp?: number };
const mem = new Map<string, Entry>();

export function cacheGet<T = unknown>(key: string): T | null {
  const entry = mem.get(key);
  if (!entry) return null;
  if (entry.exp && entry.exp < Date.now()) {
    mem.delete(key);
    return null;
  }
  return entry.v as T;
}

export function cacheSet(key: string, value: unknown, ttlMs?: number) {
  mem.set(key, { v: value, exp: ttlMs ? Date.now() + ttlMs : undefined });
}
