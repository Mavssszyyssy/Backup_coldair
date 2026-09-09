import { paymentOutcome } from "./paymentOutcome";
import { openOnlineCheckout } from "./openOnlineCheckout";
import { paymentOutcome as mobileOutcome } from "../../../../bork5/caact-mobile/services/paymentOutcome";

const order = { paymentProvider: "paymongo", paymentMethod: "gcash", paymentStatus: "pending" };
describe.each([["web", paymentOutcome], ["mobile", mobileOutcome]])("%s payment outcomes", (_name, outcome) => {
  test.each(["returned", "cancelled"])("unpaid %s is Transaction Failed", (state) => {
    expect(outcome(order, state).title).toBe("Transaction Failed");
  });
  test.each(["returned", "cancelled", "success"])("verified paid wins over %s callback", (state) => {
    expect(outcome({ ...order, paymentStatus: "paid" }, state).kind).toBe("paid");
  });
  test("success URL alone never confirms a payment", () => {
    expect(outcome(order, "success").kind).toBe("pending");
  });
  test.each(["failed", "expired", "cancelled"])("%s processor status fails", (paymentStatus) => {
    expect(outcome({ ...order, paymentStatus }, "success").title).toBe("Transaction Failed");
  });
  test("missing details or verification error never shows success", () => {
    expect(outcome(null, "success").kind).toBe("unknown");
    expect(outcome({ ...order, paymentStatus: "paid" }, "success", { error: true }).kind).toBe("unknown");
  });
  test("loading and COD do not claim confirmed payment", () => {
    expect(outcome(order, "returned", { checking: true }).kind).toBe("checking");
    const cod = outcome({ paymentMethod: "cod", paymentStatus: "pending" });
    expect(cod.kind).toBe("received");
    expect(cod.body).toContain("collected on delivery");
  });
});
test("browser Back returns to the saved order, including cached checkout and retry pages", () => {
  const browser = { history: { state: { idx: 2 }, replaceState: vi.fn() }, location: { assign: vi.fn(), reload: vi.fn() }, addEventListener: vi.fn() };
  openOnlineCheckout("https://checkout.example", "order123", browser);
  expect(browser.history.replaceState).toHaveBeenCalledWith({ idx: 2 }, "", "/order-confirmation/order123?payment=returned");
  expect(browser.location.assign).toHaveBeenCalledWith("https://checkout.example");
  const onPageShow = browser.addEventListener.mock.calls[0][1];
  onPageShow({ persisted: true });
  expect(browser.location.reload).toHaveBeenCalledTimes(1);
});
