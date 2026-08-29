import fs from "fs";
import path from "path";
import { filterAndSortProducts } from "./ecommerceService";
import { validatePostalCodeForAddress } from "./postalCodeValidation";
import { validatePassword, validatePhone } from "../utils/authValidation";
import { formatUnitHorsepower } from "./unitDisplayService";
import { formatCartHorsepower, formatCartModel } from "./cartDisplayService";
import { resolveOrderDeliveryStatus } from "./orderStatusService";

describe("mobile customer readiness rules", () => {
  test("account recovery is backend-authoritative and has no device-local fallback", () => {
    const source = fs.readFileSync(path.join(__dirname, "customerSecurityService.jsx"), "utf8");
    expect(source).not.toContain("AsyncStorage");
    expect(source).not.toContain("Math.random");
    expect(source).toContain("api.consumeRecoveryCode");
    expect(source).toContain("api.verifyTotpSetup");
  });

  test("postal code is required and must match the selected city", () => {
    const address = { region: "CALABARZON", province: "Cavite", city: "Bacoor" };
    expect(validatePostalCodeForAddress({ ...address, postalCode: "" })).toMatch(/required/i);
    expect(validatePostalCodeForAddress({ ...address, postalCode: "4102" })).toBe("");
    expect(validatePostalCodeForAddress({ ...address, postalCode: "1000" })).toMatch(/does not match/i);
    expect(validatePostalCodeForAddress({ ...address, city: "Quezon City", postalCode: "1100" })).toMatch(/service area/i);
  });

  test("customer product filters preserve real inventory records", () => {
    const products = [
      { id: "1", name: "Cold Air One", brand: "Cold Air", model: "CA-1", sku: "CA-1", category: "split", price: 20000 },
      { id: "2", name: "Other Window", brand: "Other", model: "OT-1", sku: "OT-1", category: "window", price: 15000 },
    ];
    expect(filterAndSortProducts(products, { selectedBrand: "Cold Air" })).toHaveLength(1);
    expect(filterAndSortProducts(products, { searchTerm: "OT-1" })[0].id).toBe("2");
  });

  test("mobile credentials apply phone and password limits", () => {
    expect(validatePhone("09123456789")).toBe("");
    expect(validatePhone("123")).toBeTruthy();
    expect(validatePassword("Aa1!1234")).toBe("");
    expect(validatePassword(`Aa1!${"x".repeat(22)}`)).toMatch(/25/);
  });

  test("registered AC units show their recorded horsepower", () => {
    expect(formatUnitHorsepower({ capacityHp: 2.5 })).toBe("2.5 HP");
    expect(formatUnitHorsepower({ horsepower: "1.0HP" })).toBe("1 HP");
    expect(formatUnitHorsepower({})).toBe("Not recorded");
    expect(formatUnitHorsepower(null)).toBe("Not recorded");
  });

  test("AC unit details use pages, a room-size selector, and customer-visible GPS check-in", () => {
    const detailsSource = fs.readFileSync(
      path.join(__dirname, "..", "app", "customer", "units", "[id].jsx"),
      "utf8",
    );
    const historySource = fs.readFileSync(
      path.join(__dirname, "customerHistoryService.jsx"),
      "utf8",
    );

    expect(detailsSource).toContain("DETAIL_PAGES");
    expect(detailsSource).toContain("BottomSheetSelect");
    expect(detailsSource).toContain("Technician Check-in");
    expect(detailsSource).toContain("Open Check-in Map");
    expect(historySource).toContain('String(task.customerId || "") === String(userId)');
  });

  test("mobile cart shows model and horsepower with add-to-cart feedback", () => {
    const shopSource = fs.readFileSync(
      path.join(__dirname, "..", "app", "customer", "shop.jsx"),
      "utf8",
    );
    const checkoutSource = fs.readFileSync(
      path.join(__dirname, "..", "app", "customer", "checkout.jsx"),
      "utf8",
    );
    const ordersSource = fs.readFileSync(
      path.join(__dirname, "..", "app", "customer", "orders.jsx"),
      "utf8",
    );

    expect(formatCartModel({ sku: "HSN24IPX3" })).toBe("HSN24IPX3");
    expect(formatCartModel({ serialUnits: [{ productSku: "HSN24IPX3" }] })).toBe("HSN24IPX3");
    expect(formatCartHorsepower({ specs: "2.5HP Inverter" })).toBe("2.5 HP");
    expect(shopSource).toContain("Model: {formatCartModel(item)}");
    expect(shopSource).toContain("Horsepower: {formatCartHorsepower(item)}");
    expect(shopSource).toContain("Added to cart");
    expect(checkoutSource).toContain("Model: {formatCartModel(item)}");
    expect(ordersSource).toContain("Model: {formatCartModel(item)}");
  });

  test("authenticator login uses clear recovery wording", () => {
    const loginSource = fs.readFileSync(
      path.join(__dirname, "..", "app", "(auth)", "login.jsx"),
      "utf8",
    );
    expect(loginSource).toContain("I have a different account");
    expect(loginSource).toContain("I don't have my authenticator");
    expect(loginSource).toContain("I don't have an account");
    expect(loginSource).toContain('pathname: "/recover/factor/2"');
  });

  test("pending warranties explain automatic activation without an acceptance action", () => {
    const detailsSource = fs.readFileSync(
      path.join(__dirname, "..", "app", "customer", "units", "[id].jsx"),
      "utf8",
    );
    expect(detailsSource).toContain("Waiting for installation verification");
    expect(detailsSource).toContain("No acceptance is required from you");
    expect(detailsSource).toContain("What happens next");
  });

  test("completed orders override stale delivery state and use a readable progress timeline", () => {
    const ordersSource = fs.readFileSync(
      path.join(__dirname, "..", "app", "customer", "orders.jsx"),
      "utf8",
    );
    expect(resolveOrderDeliveryStatus("complete", "pending")).toBe("DELIVERED");
    expect(ordersSource).toContain("OrderStepTimeline");
    expect(ordersSource).toContain("Cash on delivery");
  });

  test("address editing keeps one save action and a compact default-address choice", () => {
    const settingsSource = fs.readFileSync(
      path.join(__dirname, "..", "app", "customer", "settings.jsx"),
      "utf8",
    );
    expect(settingsSource).toContain("Use as my default delivery address");
    expect(settingsSource).toContain("This choice will be applied when you save the address");
    expect(settingsSource).not.toContain('title={addressForm.isDefault ? "Default delivery address"');
  });
});
