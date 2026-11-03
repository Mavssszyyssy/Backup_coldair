import { render, screen } from "@testing-library/react";
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
