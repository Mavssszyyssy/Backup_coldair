import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCartHorsepower, formatCartModel } from "./cartProductDetails";

describe("cart product details", () => {
  it("shows the product model and recorded horsepower", () => {
    expect(formatCartModel({ model: "HSN24IPX3" })).toBe("HSN24IPX3");
    expect(formatCartModel({ sku: "TAC12-CWI" })).toBe("TAC12-CWI");
    expect(formatCartHorsepower({ horsepower: 2.5 })).toBe("2.5 HP");
    expect(formatCartHorsepower({ specs: "1.0HP Inverter" })).toBe("1 HP");
  });

  it("uses customer-friendly wording when catalogue data is incomplete", () => {
    expect(formatCartModel(null)).toBe("Not specified");
    expect(formatCartHorsepower(null)).toBe("Not specified");
  });

  it("keeps the cart details and success feedback visible in the storefront", () => {
    const cartSource = fs.readFileSync(
      path.resolve(process.cwd(), "src", "components", "common", "boutique", "BoutiqueCart.js"),
      "utf8",
    );
    const shopSource = fs.readFileSync(
      path.resolve(process.cwd(), "src", "components", "shop", "Shop.js"),
      "utf8",
    );

    expect(cartSource).toContain("Model: {formatCartModel(item)}");
    expect(cartSource).toContain("Horsepower: {formatCartHorsepower(item)}");
    expect(shopSource).toContain("Added to cart");
  });

  it("shows horsepower throughout admin and superadmin reorder management", () => {
    const sources = [
      path.resolve(process.cwd(), "src", "components", "ADMIN", "Reorder", "LowStockItems.js"),
      path.resolve(process.cwd(), "src", "components", "ADMIN", "Reorder", "ReorderForm.js"),
      path.resolve(process.cwd(), "src", "components", "ADMIN", "Reorder", "AdminReoder.js"),
      path.resolve(process.cwd(), "src", "components", "SUPERADMIN", "Dashboard", "SuperAdminReorders.js"),
    ].map((file) => fs.readFileSync(file, "utf8"));

    sources.forEach((source) => expect(source).toContain("formatCartHorsepower"));
  });
});
