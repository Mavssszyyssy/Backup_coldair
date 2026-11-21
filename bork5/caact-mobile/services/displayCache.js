// Display-only memory snapshots. Never persist tokens or use these reads to
// authorize work, reserve stock, validate checkout, or confirm payments.
const entries = new Map();
const pending = new Map();
const revisions = { data: 0, notifications: 0 };
const writes = { data: 0, notifications: 0 };
const MAX_AGE = 10 * 60_000;
const MAX_CHARS = 4_000_000;
let chars = 0;
const clone = (value) => JSON.parse(JSON.stringify(value));
const groupFor = (path) => path.startsWith('/notifications') ? 'notifications' : 'data';
const keyFor = (path, token) => JSON.stringify([token || '', path]);
const remove = (key) => { const entry = entries.get(key); if (entry) chars -= entry.json.length; entries.delete(key); };

export function invalidateMobileDisplay(group) {
  for (const key of Object.keys(revisions)) if (!group || key === group) revisions[key] += 1;
  for (const [key, entry] of entries) if (!group || entry.group === group) remove(key);
  for (const [key, entry] of pending) if (!group || entry.group === group) pending.delete(key);
}

export function beginMobileDisplayWrite(path) {
  if (/^\/(?:ai\/customer-chat|auth\/session|push-tokens)(?:\/|$)/.test(path)) return () => {};
  const group = groupFor(path);
  writes[group] += 1;
  invalidateMobileDisplay(group === 'data' ? undefined : group);
  return () => { writes[group] = Math.max(0, writes[group] - 1); invalidateMobileDisplay(group === 'data' ? undefined : group); };
}

export function readMobileDisplay(path, token, load, { ttl = 12_000, onCached, revalidate = false } = {}) {
  const key = keyFor(path, token), group = groupFor(path);
  const canReuse = !writes.data && !writes[group];
  const entry = canReuse && entries.get(key);
  if (entry) {
    const age = Date.now() - entry.loadedAt;
    if (age >= 0 && age < MAX_AGE) {
      onCached?.(JSON.parse(entry.json));
      if (age < ttl && !revalidate) return Promise.resolve(JSON.parse(entry.json));
    } else remove(key);
  }
  if (pending.has(key)) return pending.get(key).promise.then(clone);
  const revision = revisions[group];
  const record = { group };
  const promise = Promise.resolve().then(load).then((value) => {
    if (value?.status === 401 || value?.status === 403) invalidateMobileDisplay();
    if (canReuse && revisions[group] === revision && pending.get(key) === record && value?.success !== false && value?.ok !== false) {
      const json = JSON.stringify(value);
      if (json && json.length <= MAX_CHARS / 2) {
        remove(key);
        while (entries.size >= 60 || chars + json.length > MAX_CHARS) remove(entries.keys().next().value);
        entries.set(key, { json, loadedAt: Date.now(), group }); chars += json.length;
      }
    }
    return value;
  });
  record.promise = promise;
  pending.set(key, record);
  const finish = () => { if (pending.get(key) === record) pending.delete(key); };
  promise.then(finish, finish);
  return promise.then(clone);
}
