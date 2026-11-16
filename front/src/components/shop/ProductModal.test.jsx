import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ProductModal from "./ProductModal";

vi.mock("../../context/UserContext", () => ({ useUser: () => ({ currentLanguage: "English" }) }));

const product = { id: "p1", name: "Cold Air AC", brand: "Cold Air", model: "AC-1", price: 100.25, stock: 2, inStock: true, specs: "1 HP", warranty: "1 year" };

test("sold-out product details show stock and price without purchase buttons", () => {
  render(<ProductModal product={{ ...product, stock: 0, inStock: false }} onClose={vi.fn()} onAddToCart={vi.fn()} onBuyNow={vi.fn()} />);

  expect(screen.getByText("Out of stock")).toBeVisible();
  expect(screen.getByText("100.25")).toBeVisible();
  expect(screen.getByRole("button", { name: "Close product details" })).toBeVisible();
  expect(screen.queryByRole("button", { name: /unavailable|add to cart|buy now/i })).not.toBeInTheDocument();
});

test("typed decimal, zero and over-stock quantities cannot be added", async () => {
  const onAddToCart = vi.fn().mockResolvedValue(true);
  render(<ProductModal product={product} onClose={vi.fn()} onAddToCart={onAddToCart} />);
  expect(screen.getByRole("dialog", { name: "Product details: Cold Air AC" })).toBeInTheDocument();
  expect(screen.getByText("100.25")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Close product details" })).toHaveFocus();
  const input = document.querySelector(".bq-num-field");
  for (const value of ["1.5", "0", "3", "letters"]) {
    fireEvent.change(input, { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a valid quantity within availability.");
    expect(onAddToCart).not.toHaveBeenCalled();
  }
  fireEvent.change(input, { target: { value: "2" } });
  expect(screen.getByText("200.50")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));
  await waitFor(() => expect(onAddToCart).toHaveBeenCalledWith(product, 2));
});

test("Buy Now uses the selected quantity without adding anything to the cart", async () => {
  const onBuyNow = vi.fn().mockResolvedValue(true);
  const onAddToCart = vi.fn();
  const onClose = vi.fn();
  render(<ProductModal product={product} onClose={onClose} onAddToCart={onAddToCart} onBuyNow={onBuyNow} />);
  fireEvent.change(document.querySelector(".bq-num-field"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Buy Now" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(onBuyNow).toHaveBeenCalledWith(product, 2);
  expect(onAddToCart).not.toHaveBeenCalled();
});
