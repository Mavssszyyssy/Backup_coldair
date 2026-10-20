import { expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ShopCatalogue from "./ShopCatalogue";

const product = (id, inStock) => ({
  id,
  name: `Cold Air ${id}`,
  brand: "Cold Air",
  model: id,
  category: "split",
  specs: "1 HP",
  price: 20000,
  stock: inStock ? 2 : 0,
  inStock,
});

test("keeps unavailable products visible after available products without purchase actions", () => {
  const onAddToCart = vi.fn();
  const onBuyNow = vi.fn();
  render(
    <ShopCatalogue
      products={[product("sold-out", false), product("ready", true)]}
      onAddToCart={onAddToCart}
      onBuyNow={onBuyNow}
      onProductClick={vi.fn()}
      sortBy="default"
      onSortChange={vi.fn()}
    />,
  );

  expect(screen.getByText("Found 2 products")).toBeInTheDocument();
  expect(screen.getByText("Available now (1)")).toBeInTheDocument();
  expect(screen.getByText("Out of stock (1)")).toBeInTheDocument();
  const sections = document.querySelectorAll(".bq-catalogue > .bq-scrollview section");
  expect(sections[0]).toHaveTextContent("ready");
  expect(sections[1]).toHaveTextContent("sold-out");
  expect(within(sections[1]).getByRole("button", { name: "Out of stock" })).toBeDisabled();
  expect(within(sections[1]).getByRole("button", { name: "Unavailable" })).toBeDisabled();
  expect(onAddToCart).not.toHaveBeenCalled();
  expect(onBuyNow).not.toHaveBeenCalled();
});
