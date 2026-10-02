import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProductModal from "./ProductModal";
import ShopCatalogue from "./ShopCatalogue";
import ShopSidebar from "./ShopSidebar";

const product = {
  id: "product-1",
  name: "TCL Premium Inverter",
  brand: "TCL",
  category: "split",
  price: 22500,
  specs: "1.5HP",
  inStock: true,
  stock: 8,
  stockLabel: "8 Units available",
  model: "TAC-13CSD",
  warranty: "1 year parts, 5 years compressor",
  imageUrl: "/catalog/ac/tcl-breezein-kei2.jpg",
  discount: 0,
  featured: false,
  description: "Efficient inverter cooling for everyday comfort.",
};

describe("Customer catalogue presentation", () => {
  it("keeps product navigation, sorting, cart, and buy-now actions available", () => {
    const onAddToCart = vi.fn();
    const onBuyNow = vi.fn();
    const onProductClick = vi.fn();
    const onSortChange = vi.fn();

    render(
      <ShopCatalogue
        products={[product]}
        onAddToCart={onAddToCart}
        onBuyNow={onBuyNow}
        onProductClick={onProductClick}
        sortBy="default"
        onSortChange={onSortChange}
      />,
    );

    expect(screen.getByRole("heading", { name: "Air conditioner catalogue" })).toBeInTheDocument();
    expect(screen.getByText("Premium Inverter")).toBeInTheDocument();
    expect(screen.getByText("₱22,500")).toBeInTheDocument();
    expect(screen.getByText("8 Units available")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Sort products"), { target: { value: "price_asc" } });
    expect(onSortChange).toHaveBeenCalledWith("price_asc");

    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));
    expect(onAddToCart).toHaveBeenCalledWith(product, 1);

    fireEvent.click(screen.getByRole("button", { name: "Buy Now" }));
    expect(onBuyNow).toHaveBeenCalledWith(product);

    fireEvent.click(screen.getByRole("button", { name: "View TCL Premium Inverter" }));
    expect(onProductClick).toHaveBeenCalledWith(product);
  });

  it("presents useful loading and empty catalogue states", () => {
    const { rerender } = render(
      <ShopCatalogue
        products={[]}
        loading
        sortBy="default"
        onSortChange={() => {}}
      />,
    );

    expect(screen.getByText("Loading the latest available AC units...")).toBeInTheDocument();

    rerender(
      <ShopCatalogue
        products={[]}
        sortBy="default"
        onSortChange={() => {}}
      />,
    );

    expect(screen.getByRole("heading", { name: "No matching products" })).toBeInTheDocument();
    expect(screen.getByText(/try changing your search/i)).toBeInTheDocument();
  });

  it("keeps every catalogue filter operable", () => {
    const onSelectCategory = vi.fn();
    const onSelectBrand = vi.fn();
    const onPriceChange = vi.fn();
    const onSearchChange = vi.fn();
    const onClearFilters = vi.fn();

    render(
      <ShopSidebar
        categories={[
          { id: "all", name: "All Types", count: 4 },
          { id: "split", name: "Split Type", count: 3 },
        ]}
        selectedCategory="all"
        onSelectCategory={onSelectCategory}
        brands={["all", "TCL"]}
        selectedBrand="all"
        onSelectBrand={onSelectBrand}
        priceRange={{ min: 0, max: 100000 }}
        onPriceChange={onPriceChange}
        searchTerm=""
        onSearchChange={onSearchChange}
        onClearFilters={onClearFilters}
      />,
    );

    fireEvent.change(screen.getByLabelText("Search products"), { target: { value: "TCL" } });
    expect(onSearchChange).toHaveBeenCalledWith("TCL");

    fireEvent.click(screen.getByRole("button", { name: /Split Type/ }));
    expect(onSelectCategory).toHaveBeenCalledWith("split");

    fireEvent.change(screen.getByLabelText("Brand"), { target: { value: "TCL" } });
    expect(onSelectBrand).toHaveBeenCalledWith("TCL");

    fireEvent.change(screen.getByLabelText("Minimum"), { target: { value: "10000" } });
    expect(onPriceChange).toHaveBeenCalledWith("min", "10000");

    fireEvent.change(screen.getByLabelText("Maximum"), { target: { value: "50000" } });
    expect(onPriceChange).toHaveBeenCalledWith("max", "50000");

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);

    const mobileToggle = screen.getByRole("button", { name: /Search and filters/ });
    expect(mobileToggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(mobileToggle);
    expect(mobileToggle).toHaveAttribute("aria-expanded", "true");
  });

  it("preserves product-detail quantity and add-to-cart behavior", () => {
    const onAddToCart = vi.fn();
    const onClose = vi.fn();

    render(
      <ProductModal
        product={product}
        onAddToCart={onAddToCart}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Premium Inverter" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));

    expect(onAddToCart).toHaveBeenCalledWith(product, 2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
