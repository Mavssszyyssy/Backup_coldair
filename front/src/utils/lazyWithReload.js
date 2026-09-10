import { lazy } from "react";

const RECOVERY_PREFIX = "aeropulse:lazy-route-reload:";
const CHUNK_LOAD_ERROR =
  /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|loading chunk [^ ]+ failed|dynamically imported module|javascript-or-wasm module script|mime type ["']?text\/html/i;

const browserEnvironment = () => ({
  location: typeof window !== "undefined" ? window.location : null,
  storage: typeof window !== "undefined" ? window.sessionStorage : null,
});

export const isChunkLoadError = (error) =>
  CHUNK_LOAD_ERROR.test(String(error?.message || error || ""));

export const loadLazyModule = async (importer, routeName, environment = browserEnvironment()) => {
  const pathname = environment?.location?.pathname || "unknown";
  const recoveryKey = `${RECOVERY_PREFIX}${routeName}:${pathname}`;

  try {
    const module = await importer();
    environment?.storage?.removeItem?.(recoveryKey);
    return module;
  } catch (error) {
    const canReload =
      isChunkLoadError(error) &&
      environment?.location?.reload &&
      environment?.storage?.getItem &&
      environment?.storage?.setItem;

    if (canReload && environment.storage.getItem(recoveryKey) !== "attempted") {
      environment.storage.setItem(recoveryKey, "attempted");
      environment.location.reload();

      // Keep React Suspense mounted while the browser replaces the stale app
      // shell. Rejecting here would briefly replace the page with an error.
      return new Promise(() => {});
    }

    throw error;
  }
};

export const lazyWithReload = (importer, routeName) =>
  lazy(() => loadLazyModule(importer, routeName));
