import { expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ShopCatalogue from "./ShopCatalogue";

const languageState = vi.hoisted(() => ({ value: "English" }));
vi.mock("../../context/UserContext", () => ({ useUser: () => ({ currentLanguage: languageState.value }) }));

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
  languageState.value = "English";
  const onAddToCart = vi.fn();
  const onBuyNow = vi.fn();
  const onProductClick = vi.fn();
  const soldOutProduct = product("sold-out", false);
  render(
    <ShopCatalogue
      products={[soldOutProduct, { ...product("ready", true), price: 19999.5, oldPrice: 21000, stockLabel: "Low stock" }]}
      onAddToCart={onAddToCart}
      onBuyNow={onBuyNow}
      onProductClick={onProductClick}
      sortBy="default"
      onSortChange={vi.fn()}
    />,
  );

  expect(screen.getByText("Found 2 products")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Sort products" })).toBeInTheDocument();
  expect(screen.getByText("Available now (1)")).toBeInTheDocument();
  expect(screen.getByText("Out of stock (1)")).toBeInTheDocument();
  const sections = document.querySelectorAll(".bq-catalogue > .bq-scrollview section");
  expect(sections[0]).toHaveTextContent("ready");
  expect(sections[1]).toHaveTextContent("sold-out");
  expect(within(sections[0]).getByText("₱19,999.50")).toBeInTheDocument();
  expect(within(sections[0]).getByText("₱21,000.00")).toBeInTheDocument();
  const available = within(sections[0]);
  const buyNow = available.getByRole("button", { name: "Buy Now" });
  const addToCart = available.getByRole("button", { name: "Add to Cart" });
  fireEvent.mouseOver(buyNow);
  expect(available.getByText("Low stock")).toBeVisible();
  expect(available.getByText("₱19,999.50")).toBeVisible();
  expect(buyNow).toBeVisible();
  expect(addToCart).toBeVisible();
  expect(within(sections[1]).getByText("₱20,000.00")).toBeInTheDocument();
  expect(within(sections[0]).getByRole("img", { name: "Cold Air ready" })).toHaveAttribute("loading", "eager");
  expect(within(sections[0]).getByRole("img", { name: "Cold Air ready" })).toHaveAttribute("fetchpriority", "high");
  expect(within(sections[1]).getByRole("img", { name: "Cold Air sold-out" })).toHaveAttribute("loading", "lazy");
  const soldOut = within(sections[1]);
  expect(soldOut.getAllByText("Out of stock")).toHaveLength(1);
  const viewDetails = soldOut.getByRole("button", { name: "View details: Cold Air sold-out" });
  expect(soldOut.getAllByRole("button")).toEqual([viewDetails]);
  fireEvent.click(viewDetails);
  expect(onProductClick).toHaveBeenCalledExactlyOnceWith(soldOutProduct);
  expect(onAddToCart).not.toHaveBeenCalled();
  expect(onBuyNow).not.toHaveBeenCalled();
});

test("switches shop labels while preserving product names and stock order", () => {
  languageState.value = "Filipino";
  const props = {
    products: [product("sold-out", false), product("ready", true)],
    onProductClick: vi.fn(),
    sortBy: "default",
    onSortChange: vi.fn(),
  };
  const { rerender } = render(<ShopCatalogue {...props} />);
  expect(screen.getByText("Available ngayon (1)")).toBeInTheDocument();
  expect(screen.getByText("Ubos ang stock (1)")).toBeInTheDocument();
  expect(screen.getAllByText("ready").length).toBeGreaterThan(0);
  expect(screen.getAllByText("sold-out").length).toBeGreaterThan(0);
  expect(screen.getByText("2 produktong nakita")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Ayusin ang mga produkto" })).toBeInTheDocument();
  languageState.value = "English";
  rerender(<ShopCatalogue {...props} />);
  expect(screen.getByText("Available now (1)")).toBeInTheDocument();
  expect(screen.getByText("Out of stock (1)")).toBeInTheDocument();
});
