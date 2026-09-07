import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CancelOrderDialog from "./CancelOrderDialog";
const order = { id: "order-1", orderCode: "CAA-123", paymentMethod: "cod" };
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
});
afterEach(cleanup);
it("validates the reason and submits only after explicit confirmation", async () => {
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<CancelOrderDialog order={order} onConfirm={onConfirm} onClose={onClose} />);
  expect(screen.getByRole("dialog", { name: "Cancel this order?" })).toBeTruthy();
  fireEvent.click(screen.getByText("Confirm cancellation"));
  expect(screen.getByRole("alert")).toHaveTextContent("Please tell us why");
  expect(onConfirm).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "  Ordered the wrong model  " } });
  fireEvent.click(screen.getByText("Confirm cancellation"));
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  expect(onConfirm).toHaveBeenCalledWith(order, "Ordered the wrong model");
});
it("dismisses without cancelling an order and restores body scrolling", () => {
  const confirm = vi.fn(), close = vi.fn();
  const { unmount } = render(<CancelOrderDialog order={order} onConfirm={confirm} onClose={close} />);
  fireEvent.click(screen.getByText("Keep my order"));
  expect(confirm).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledOnce();
  unmount();
  expect(document.body.style.overflow).not.toBe("hidden");
});
it("keeps entered text on errors and explains paid-order refund review", async () => {
  const onConfirm = vi.fn().mockRejectedValue(new Error("This order has already been dispatched."));
  const close = vi.fn();
  render(<CancelOrderDialog order={{ ...order, paymentProvider: "paymongo", paymentStatus: "paid" }} onConfirm={onConfirm} onClose={close} />);
  expect(screen.getByText(/does not issue an automatic refund/)).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Wrong model" } });
  fireEvent.click(screen.getByText("Submit request"));
  await screen.findByText("This order has already been dispatched.");
  expect(screen.getByRole("textbox")).toHaveValue("Wrong model");
  expect(close).not.toHaveBeenCalled();
});
it("blocks duplicate submissions and Escape while saving", async () => {
  let resolve;
  const onConfirm = vi.fn(() => new Promise(done => { resolve = done; }));
  const close = vi.fn();
  render(<CancelOrderDialog order={order} onConfirm={onConfirm} onClose={close} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Wrong model" } });
  fireEvent.click(screen.getByText("Confirm cancellation"));
  fireEvent.submit(screen.getByRole("textbox").closest("form"));
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
  expect(onConfirm).toHaveBeenCalledOnce();
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByText("Keep my order")).toBeDisabled();
  await act(async () => resolve());
});
