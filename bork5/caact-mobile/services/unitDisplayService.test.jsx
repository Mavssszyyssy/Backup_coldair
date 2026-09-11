import {
  filterCustomerUnits,
  formatUnitInstallationDate,
  formatUnitPurchaseDate,
  sortCustomerUnits,
} from "./unitDisplayService";

describe("mobile customer AC unit organization", () => {
  test("shows the newest recorded purchase first even when an older unit was updated later", () => {
    const units = [
      { id: "older", installationDate: "2026-01-10T00:00:00.000Z", updatedAt: "2026-12-01T00:00:00.000Z" },
      { id: "newer", installationDate: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z" },
    ];

    expect(sortCustomerUnits(units).map((unit) => unit.id)).toEqual(["newer", "older"]);
    expect(sortCustomerUnits(units, "oldest").map((unit) => unit.id)).toEqual(["older", "newer"]);
  });

  test("searches only recorded customer-visible unit information", () => {
    const units = [
      { id: "one", brand: "TCL", productSku: "TAC09", serialNumber: "SERIAL-001", orderCode: "ORD-100", serviceBranch: "Cavite" },
      { id: "two", brand: "LG", model: "Premium Dual Inverter", serialNumber: "SERIAL-002", placementArea: "Bedroom" },
    ];

    expect(filterCustomerUnits(units, "serial-002").map((unit) => unit.id)).toEqual(["two"]);
    expect(filterCustomerUnits(units, "cavite").map((unit) => unit.id)).toEqual(["one"]);
    expect(filterCustomerUnits(units, "ord-100").map((unit) => unit.id)).toEqual(["one"]);
  });

  test("does not invent an installation date", () => {
    expect(formatUnitInstallationDate({})).toBe("Not recorded");
    expect(formatUnitPurchaseDate({})).toBe("Not recorded");
    expect(formatUnitInstallationDate({ installationDate: "2026-09-10" })).toMatch(/Sep 10, 2026/);
  });
});
