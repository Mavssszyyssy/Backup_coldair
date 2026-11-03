import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ProductModal from "./ProductModal";

vi.mock("../../context/UserContext", () => ({ useUser: () => ({ currentLanguage: "English" }) }));

const product = { id: "p1", name: "Cold Air AC", brand: "Cold Air", model: "AC-1", price: 100, stock: 2, inStock: true, specs: "1 HP", warranty: "1 year" };

test("typed decimal, zero and over-stock quantities cannot be added", async () => {
  const onAddToCart = vi.fn().mockResolvedValue(true);
  render(<ProductModal product={product} onClose={vi.fn()} onAddToCart={onAddToCart} />);
  expect(screen.getByRole("dialog", { name: "Product details: Cold Air AC" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Close product details" })).toHaveFocus();
  const input = document.querySelector(".bq-num-field");
  for (const value of ["1.5", "0", "3", "letters"]) {
    fireEvent.change(input, { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("whole number between 1 and 2");
    expect(onAddToCart).not.toHaveBeenCalled();
  }
  fireEvent.change(input, { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));
  await waitFor(() => expect(onAddToCart).toHaveBeenCalledWith(product, 2));
});
