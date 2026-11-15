const SHORT_TTL = 12_000;
const PAGE_TTL = 30_000;
const REFERENCE_TTL = 120_000;
const MAX_SNAPSHOT_AGE = 180_000;
const MAX_ENTRIES = 80;
const MAX_CACHE_CHARS = 4_000_000;

const publicReference = /^\/(?:branches|system-settings\/email-domains\/public)$/;
const reference = /^\/(?:service-requests\/catalog|system-settings\/email-domains)$/;
const operational = /^\/(?:orders|tasks|products|notifications|contact-messages|service-requests|warranties|reorders|inventory-change-requests|restock-orders)(?:\/|$)/;
const pageData = /^\/(?:dashboard|analytics|reports|amp|users)(?:\/|$)/;
const liveOnly = /\/(?:paymongo|quote|availability|verify)(?:\/|$)/;

export function readCacheTtl(path, { token, display, headers, signal }) {
  if (headers || signal) return 0;
  const route = path.split("?")[0];
  if (route === "/products/public") return display ? 15_000 : 0;
  if (route === "/branches/resolve") return display && token ? PAGE_TTL : 0;
  if (publicReference.test(route)) return REFERENCE_TTL;
  if (!token || liveOnly.test(route)) return 0;
  if (reference.test(route)) return REFERENCE_TTL;
  if (route === "/users/addresses" || operational.test(route)) return SHORT_TTL;
  return pageData.test(route) ? PAGE_TTL : 0;
}

// Keep only completed JSON responses, bounded by entry count and total size.
export function createPageDataCache() {
  const entries = new Map();
  let chars = 0;

  function remove(key) {
    const entry = entries.get(key);
    if (!entry) return;
    chars -= entry.json.length;
    entries.delete(key);
  }

  return {
    remove,
    read(key, ttl, includeSnapshot) {
      const entry = entries.get(key);
      if (!entry) return null;
      const age = Date.now() - entry.loadedAt;
      if (age >= MAX_SNAPSHOT_AGE || age < 0) {
        remove(key);
        return null;
      }
      if (age >= ttl && !includeSnapshot) return null;
      entries.delete(key);
      entries.set(key, entry);
      return { fresh: age < ttl, loadedAt: entry.loadedAt, data: JSON.parse(entry.json) };
    },
    save(key, data, group) {
      if (!data || typeof data !== "object" || data.success === false) { remove(key); return; }
      const json = JSON.stringify(data);
      if (json.length > MAX_CACHE_CHARS / 2) { remove(key); return; }
      remove(key);
      while (entries.size >= MAX_ENTRIES || chars + json.length > MAX_CACHE_CHARS) {
        remove(entries.keys().next().value);
      }
      entries.set(key, { json, loadedAt: Date.now(), group });
      chars += json.length;
    },
    invalidate(group) {
      for (const [key, entry] of entries) {
        if (!group || group === entry.group) remove(key);
      }
    },
  };
}
