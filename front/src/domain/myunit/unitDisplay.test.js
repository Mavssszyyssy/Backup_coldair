import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatUnitHorsepower } from "./unitDisplay";

describe("customer AC unit display", () => {
  it("shows the recorded horsepower in customer-friendly wording", () => {
    expect(formatUnitHorsepower({ capacityHp: 2.5 })).toBe("2.5 HP");
    expect(formatUnitHorsepower({ horsepower: "1.0HP" })).toBe("1 HP");
  });

  it("does not invent horsepower when the unit has no recorded capacity", () => {
    expect(formatUnitHorsepower({})).toBe("Not recorded");
    expect(formatUnitHorsepower(null)).toBe("Not recorded");
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
