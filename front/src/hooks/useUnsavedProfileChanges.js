import { useCallback, useEffect, useRef } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";
import { confirmDialog } from "../utils/dialog";

export default function useUnsavedProfileChanges(dirty, saving, t) {
  const pendingConfirmation = useRef(null);
  const shouldBlock = useCallback(({ currentLocation, nextLocation }) => (
    (dirty || saving) && (
      currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search
    )
  ), [dirty, saving]);
  const blocker = useBlocker(shouldBlock);

  const confirmDiscard = useCallback(async () => {
    if (saving) return false;
    if (!dirty) return true;
    pendingConfirmation.current ??= confirmDialog({
      title: t("Discard changes?"),
      message: t("Your unsaved changes will be lost."),
      cancelText: t("Keep Editing"),
      confirmText: t("Discard"),
      destructive: true,
    }).finally(() => { pendingConfirmation.current = null; });
    return pendingConfirmation.current;
  }, [dirty, saving, t]);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (saving || !dirty) {
      blocker.reset();
      return;
    }
    let active = true;
    void confirmDiscard().then((discard) => {
      if (!active) return;
      if (discard) blocker.proceed();
      else blocker.reset();
    });
    return () => { active = false; };
  }, [blocker, confirmDiscard, dirty, saving]);

  useBeforeUnload(useCallback((event) => {
    if (!dirty && !saving) return;
    event.preventDefault();
    event.returnValue = "";
  }, [dirty, saving]));

  return confirmDiscard;
}
