export function openOnlineCheckout(paymentUrl, orderId, browser = window) {
  // Replace checkout in history so the provider's Back button returns to
  // verification of the saved order, not an empty cart or a success screen.
  browser.history.replaceState(
    browser.history.state,
    "",
    `/order-confirmation/${encodeURIComponent(orderId)}?payment=returned`,
  );
  // A restored back/forward cache contains the old React checkout tree.
  // Reload the new return URL instead of rendering that stale tree.
  browser.addEventListener("pageshow", (event) => {
    if (event.persisted) browser.location.reload();
  }, { once: true });
  browser.location.assign(paymentUrl);
}
