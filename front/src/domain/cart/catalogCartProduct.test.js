import { describe, expect, it } from "vitest";
import {
  getCatalogProductImageUrl,
  mapCatalogProductToCartProduct,
  resolveReorderCartProduct,
} from "./catalogCartProduct";

describe("catalogue cart product details", () => {
  const catalogProduct = {
    id: "product-1",
    name: "Samsung Windfree WallMount AC",
    sku: "12345678",
    brand: "Samsung",
    category: "split",
    specs: "1.5 HP",
    price: 38895,
    stock: 4,
    image: "/api/products/product-1/image",
  };

  it("maps the live catalogue fields used by the storefront cart", () => {
    expect(mapCatalogProductToCartProduct(catalogProduct)).toMatchObject({
      id: "product-1",
      name: "Samsung Windfree WallMount",
      model: "12345678",
      sku: "12345678",
      brand: "Samsung",
      horsepower: 1.5,
      price: 38895,
      stock: 4,
      imageUrl: "/catalog/ac/samsung-windfree-wallmount.png",
    });
  });

  it("restores model, brand, image, and current product data when reordering", () => {
    const reordered = resolveReorderCartProduct(
      {
        productId: "product-1",
        name: "Samsung Windfree WallMount",
        specs: "1.5 HP",
        price: 37995,
      },
      [catalogProduct],
    );

    expect(reordered).toMatchObject({
      id: "product-1",
      model: "12345678",
      brand: "Samsung",
      imageUrl: "/catalog/ac/samsung-windfree-wallmount.png",
      horsepower: 1.5,
      price: 38895,
      stock: 4,
    });
  });

  it("uses the saved order snapshot when the catalogue cannot be refreshed", () => {
    const reordered = resolveReorderCartProduct({
      productId: "legacy-product",
      name: "TCL Window AC",
      sku: "TAC12-CWI-UJE2",
      specs: "1.5 HP",
      price: 22500,
    });

    expect(reordered).toMatchObject({
      id: "legacy-product",
      model: "TAC12-CWI-UJE2",
      horsepower: 1.5,
      imageUrl: "/catalog/ac/tcl-uje-window.png",
    });
    expect(getCatalogProductImageUrl({ sku: "HSN30IPC" })).toBe(
      "/catalog/ac/lg-hsn30ipc.png",
    );
  });

  it("does not request a catalog advertising click-through as an image", () => {
    const invalid = { ...catalogProduct, sku: "ULTRAMEKASUS", image: "https://www.google.com/aclk?adurl=" };
    expect(getCatalogProductImageUrl(invalid)).toBe("");
    expect(mapCatalogProductToCartProduct(invalid).imageUrl).toBe("/catalog/ac/generic-ac.jpg");
    expect(getCatalogProductImageUrl(catalogProduct)).toBe("/catalog/ac/samsung-windfree-wallmount.png");
    expect(getCatalogProductImageUrl({ sku: "WA70F13E4LTC" })).toBe("/catalog/ac/samsung-bespoke-ai.png");
    expect(getCatalogProductImageUrl({ sku: "OTHER", image: "/api/products/other/image" })).toBe("/api/products/other/image");
  });
});
