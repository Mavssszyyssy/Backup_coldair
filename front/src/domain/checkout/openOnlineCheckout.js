export function openOnlineCheckout(paymentUrl, orderId, browser = window) {
  const link = String(paymentUrl || "").trim();
  let checkoutUrl;
  try {
    checkoutUrl = new URL(link);
  } catch (_error) {
    throw new Error("The secure payment link is invalid and could not be opened.");
  }
  if (checkoutUrl.protocol !== "https:") {
    throw new Error("The secure payment link is invalid and could not be opened.");
  }

  const previousUrl = `${browser.location.pathname || ""}${browser.location.search || ""}${browser.location.hash || ""}`;
  const previousState = browser.history.state;
  const handlePageShow = (event) => {
    if (event.persisted) browser.location.reload();
  };
  // Replace checkout in history so the provider's Back button returns to
  // verification of the saved order, not an empty cart or a success screen.
  let historyReplaced = false;
  let listenerRegistered = false;
  try {
    browser.history.replaceState(
      previousState,
      "",
      `/order-confirmation/${encodeURIComponent(orderId)}?payment=returned`,
    );
    historyReplaced = true;
    // A restored back/forward cache contains the old React checkout tree.
    // Reload the new return URL instead of rendering that stale tree.
    browser.addEventListener("pageshow", handlePageShow, { once: true });
    listenerRegistered = true;
    browser.location.assign(link);
  } catch (_error) {
    if (listenerRegistered) browser.removeEventListener("pageshow", handlePageShow);
    if (historyReplaced && previousUrl) {
      try {
        browser.history.replaceState(previousState, "", previousUrl);
      } catch (_restoreError) {
        // The customer still gets the saved-order fallback if history restoration is blocked.
      }
    }
    throw new Error("This browser could not open the secure payment link.");
  }
}
