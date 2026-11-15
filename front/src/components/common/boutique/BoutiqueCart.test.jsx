import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import BoutiqueCart from "./BoutiqueCart";

const callbacks = {
  isOpen: true,
  onClose: vi.fn(),
  onUpdateQuantity: vi.fn(),
  onRemoveItem: vi.fn(),
  onCheckout: vi.fn(),
  getCartTotal: () => 1000,
};

it("localizes the cart shell while preserving the product name", () => {
  render(<BoutiqueCart {...callbacks} currentLanguage="Filipino" cart={[{ id: "unit-1", name: "Bespoke AC", brand: "Samsung", model: "Bespoke", horsepower: "2.5 HP", price: 1000, quantity: 1, stock: 3 }]} />);
  expect(screen.getByText("Iyong Cart")).toBeInTheDocument();
  expect(screen.getByText("Bespoke AC")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Mag-checkout Ngayon" })).toBeInTheDocument();
});

it("opens the selected AC image, updates its quantity and totals, and returns focus to the photo", () => {
  const onClose = vi.fn();
  const onCheckout = vi.fn();
  function CartFixture() {
    const [cart, setCart] = useState([
      { id: "unit-1", name: "Window AC", price: 900, quantity: 1, stock: 2 },
      { id: "unit-2", name: "Bespoke AC", model: "WA70", horsepower: 2.5, price: 1300.5, quantity: 2, stock: 3, imageUrl: "/bespoke.jpg" },
    ]);
    return <BoutiqueCart {...callbacks} cart={cart} onClose={onClose} onCheckout={onCheckout}
      getCartTotal={() => cart.reduce((total, item) => total + item.price * item.quantity, 0)}
      onUpdateQuantity={(id, quantity) => setCart((current) => current.map((item) => item.id === id ? { ...item, quantity } : item))} />;
  }

  render(<CartFixture />);
  fireEvent.click(screen.getByRole("button", { name: "View details: Bespoke AC" }));
  const details = within(screen.getByRole("dialog", { name: "Cart item details" }));
  expect(details.getByRole("img", { name: "Bespoke AC" })).toHaveAttribute("src", "/bespoke.jpg");
  expect(details.queryByText("Window AC")).not.toBeInTheDocument();
  expect(details.getByText("₱1,300.50")).toBeInTheDocument();
  expect(details.getByText("₱2,601.00")).toBeInTheDocument();
  expect(details.getByRole("textbox", { name: "Quantity" })).toHaveValue("2");
  fireEvent.click(details.getByRole("button", { name: "Increase Quantity" }));
  expect(details.getByText("₱3,901.50")).toBeInTheDocument();
  expect(details.getByRole("button", { name: "Increase Quantity" })).toBeDisabled();

  fireEvent.keyDown(window, { key: "Escape" });
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "View details: Bespoke AC" })).toHaveFocus();
  expect(screen.getByText("₱4,801.50")).toBeInTheDocument();
  expect(screen.getByText("₱900.00")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Checkout Now" }));
  expect(onCheckout).toHaveBeenCalledTimes(1);
});
