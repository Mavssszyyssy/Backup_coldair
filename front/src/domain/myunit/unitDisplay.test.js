import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { filterCustomerUnits, formatUnitHorsepower, sortCustomerUnits } from "./unitDisplay";

describe("customer AC unit display", () => {
  it("shows the recorded horsepower in customer-friendly wording", () => {
    expect(formatUnitHorsepower({ capacityHp: 2.5 })).toBe("2.5 HP");
    expect(formatUnitHorsepower({ horsepower: "1.0HP" })).toBe("1 HP");
  });

  it("does not invent horsepower when the unit has no recorded capacity", () => {
    expect(formatUnitHorsepower({})).toBe("Not recorded");
    expect(formatUnitHorsepower(null)).toBe("Not recorded");
  });

  it("orders registered units by installation date instead of later service updates", () => {
    const units = [
      { id: "older", installationDateRaw: "2026-01-10T00:00:00.000Z", updatedAt: "2026-12-01T00:00:00.000Z" },
      { id: "newer", installationDateRaw: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z" },
    ];

    expect(sortCustomerUnits(units).map((unit) => unit.id)).toEqual(["newer", "older"]);
    expect(sortCustomerUnits(units, "oldest").map((unit) => unit.id)).toEqual(["older", "newer"]);
  });

  it("uses the actual order date when the source order is available", () => {
    const units = [
      { id: "installed-later", purchaseDateRaw: "2026-01-01", installationDateRaw: "2026-09-10" },
      { id: "purchased-later", purchaseDateRaw: "2026-08-01", installationDateRaw: "2026-08-02" },
    ];
    expect(sortCustomerUnits(units).map((unit) => unit.id)).toEqual(["purchased-later", "installed-later"]);
  });

  it("finds a unit using its recorded customer-visible identifiers", () => {
    const units = [
      { id: "one", brand: "TCL", productSku: "TAC09", serialNumber: "SERIAL-001", orderCode: "ORD-100", serviceBranch: "Cavite" },
      { id: "two", brand: "LG", model: "Premium Dual Inverter", serialNumber: "SERIAL-002", placementArea: "Bedroom" },
    ];

    expect(filterCustomerUnits(units, "serial-002").map((unit) => unit.id)).toEqual(["two"]);
    expect(filterCustomerUnits(units, "cavite").map((unit) => unit.id)).toEqual(["one"]);
    expect(filterCustomerUnits(units, "ord-100").map((unit) => unit.id)).toEqual(["one"]);
  });

  it("keeps the AC action menu above the product image", () => {
    const css = fs.readFileSync(
      path.resolve(process.cwd(), "src", "components", "myunit", "MyUnit.css"),
      "utf8",
    );

    expect(css).toMatch(/\.unit-header\s*\{[^}]*z-index:\s*3/s);
    expect(css).toMatch(/\.unit-product-visual\s*\{[^}]*z-index:\s*1/s);
    expect(css).toContain("overflow-wrap: anywhere");
  });
});
