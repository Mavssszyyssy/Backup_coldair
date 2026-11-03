import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import LowStockItems from "./LowStockItems";

vi.mock("../../../context/UserContext", () => ({
  useUser: () => ({ currentLanguage: "English" }),
}));

it("keeps the selected low-stock page when the same products are refreshed", () => {
  const products = Array.from({ length: 7 }, (_, index) => ({
    id: `product-${index + 1}`,
    name: `Low Stock ${index + 1}`,
    stock: index,
    threshold: 10,
  }));
  const onSelect = vi.fn();
  const { rerender } = render(<LowStockItems items={products} onSelect={onSelect} />);
  const pagination = screen.getByRole("navigation", { name: "Low stock items pagination" });

  fireEvent.click(within(pagination).getByRole("button", { name: "Next" }));
  expect(screen.getByText("Low Stock 7")).toBeInTheDocument();

  rerender(<LowStockItems items={products.map((item) => ({ ...item }))} onSelect={onSelect} />);
  expect(screen.getByText("Low Stock 7")).toBeInTheDocument();
  expect(pagination).toHaveTextContent("Page 2 of 2");
});
