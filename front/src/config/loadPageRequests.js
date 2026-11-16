import { apiRequest } from "./api";

// Render a grouped page snapshot when all its lists are available for the
// current query. A missing list falls back to the normal loading path.
export function loadPageRequests(paths, { fresh, silentConnection, onCached, fallbacks = {} } = {}) {
  const cached = [];
  const timestamps = [];
  const requests = paths.map((path, index) => {
    const request = apiRequest(path, {
      fresh,
      silentConnection,
      onCached: (data, loadedAt) => {
        cached[index] = data;
        timestamps[index] = loadedAt;
      },
    });
    return Object.hasOwn(fallbacks, path) ? request.catch((error) => {
      if (error.status === 401 || error.status === 403) throw error;
      return fallbacks[path];
    }) : request;
  });
  if (Object.keys(cached).length === paths.length) onCached?.(cached, Math.min(...timestamps));
  return Promise.all(requests);
}
