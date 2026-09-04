import fs from "fs";
import path from "path";
import { filterAndSortProducts, getProductImageAssetKey } from "./ecommerceService";
import {
  getSuggestedPostalCode,
  validatePostalCodeForAddress,
} from "./postalCodeValidation";
import { validatePassword, validatePhone } from "../utils/authValidation";
import { formatUnitHorsepower } from "./unitDisplayService";
import { formatCartHorsepower, formatCartModel } from "./cartDisplayService";
import { resolveOrderDeliveryStatus } from "./orderStatusService";
import { getLatestTaskCheckIn, isActiveServiceRequest } from "./customerHistoryLogic";

describe("mobile customer readiness rules", () => {
  test("account recovery is backend-authoritative and has no device-local fallback", () => {
    const source = fs.readFileSync(path.join(__dirname, "customerSecurityService.jsx"), "utf8");
    expect(source).not.toContain("AsyncStorage");
    expect(source).not.toContain("Math.random");
    expect(source).toContain("api.consumeRecoveryCode");
    expect(source).toContain("api.verifyTotpSetup");
  });

  test("ZIP code is required and must match the selected city", () => {
    const address = { region: "CALABARZON", province: "Cavite", city: "Bacoor" };
    expect(validatePostalCodeForAddress({ ...address, postalCode: "" })).toMatch(/required/i);
    expect(validatePostalCodeForAddress({ ...address, postalCode: "4102" })).toBe("");
    expect(validatePostalCodeForAddress({ ...address, postalCode: "1000" })).toMatch(/does not match/i);
    expect(getSuggestedPostalCode(address)).toBe("4102");
    expect(validatePostalCodeForAddress({ ...address, city: "Quezon City", postalCode: "1100" })).toMatch(/city, province, and region/i);

    const pasayAddress = {
      region: "NCR",
      province: "Metro Manila",
      city: "Pasay City",
      barangay: "Barangay 142",
    };
    expect(validatePostalCodeForAddress({ ...pasayAddress, postalCode: "1300" })).toBe("");
    expect(validatePostalCodeForAddress({ ...pasayAddress, postalCode: "4102" })).toMatch(/does not match/i);
  });

  test("customer product filters preserve real inventory records", () => {
    const products = [
      { id: "1", name: "Cold Air One", brand: "Cold Air", model: "CA-1", sku: "CA-1", category: "split", price: 20000 },
      { id: "2", name: "Other Window", brand: "Other", model: "OT-1", sku: "OT-1", category: "window", price: 15000 },
    ];
    expect(filterAndSortProducts(products, { selectedBrand: "Cold Air" })).toHaveLength(1);
    expect(filterAndSortProducts(products, { searchTerm: "OT-1" })[0].id).toBe("2");
  });

  test("mobile shop uses bundled catalog images for each seeded model family", () => {
    expect(getProductImageAssetKey({ sku: "TAC-10CSD-KEI-S-2" })).toBe(
      "tcl-breezein-kei2.jpg",
    );
    expect(getProductImageAssetKey({ sku: "53CNV030WTHP" })).toBe(
      "carrier-opus-53cnv.jpg",
    );
    expect(getProductImageAssetKey({ sku: "AR12TYHYE" })).toBe(
      "samsung-ar9500t.png",
    );
    expect(getProductImageAssetKey({ sku: "unknown-model" })).toBe("generic-ac.jpg");
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
    expect(detailsSource).toContain("Next maintenance plan");
    expect(detailsSource).toContain("Service history summary");
    expect(historySource).toContain('String(task.customerId || "") === String(userId)');
    expect(detailsSource).toContain('value={String(activeRequests.length)}');
    expect(isActiveServiceRequest({ status: "Completed" })).toBe(false);
    expect(isActiveServiceRequest({ status: "In Progress" })).toBe(true);
    expect(getLatestTaskCheckIn([
      { id: "old", payload: { checkIn: { checkedInAt: "2026-01-01T00:00:00.000Z" } } },
      { id: "new", checkIn: { checkedInAt: "2026-02-01T00:00:00.000Z" } },
    ])?.task?.id).toBe("new");
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
    const bottomSheetSource = fs.readFileSync(
      path.join(__dirname, "..", "components", "ui", "BottomSheetSelect.jsx"),
      "utf8",
    );
    expect(settingsSource).toContain("Use as my default delivery address");
    expect(settingsSource).toContain("This choice will be applied when you save the address");
    expect(settingsSource).toContain('label="ZIP Code *"');
    expect(settingsSource).toContain("showKeyboardDone");
    expect(settingsSource).not.toContain("Valid ZIP code range");
    expect(bottomSheetSource).toContain("searchInputRef.current?.blur?.()");
    expect(bottomSheetSource).toContain("onDismiss={dismissKeyboard}");
    expect(settingsSource).not.toContain('title={addressForm.isDefault ? "Default delivery address"');
  });

  test("technician installation captures room capacity and AMP alerts open the unit", () => {
    const registrationSource = fs.readFileSync(
      path.join(__dirname, "..", "app", "technician", "task", "[id]", "amp-registration.jsx"),
      "utf8",
    );
    const notificationSource = fs.readFileSync(path.join(__dirname, "notificationService.jsx"), "utf8");

    expect(registrationSource).toContain("Room capacity check");
    expect(registrationSource).toContain("roomSizeSqm");
    expect(registrationSource).toContain("Save room size and verify unit");
    expect(registrationSource).toContain("It does not change the history-based servicing interval");
    expect(registrationSource).not.toContain("dustExposure");
    expect(registrationSource).not.toContain("coastalExposure");
    const historySource = fs.readFileSync(
      path.join(__dirname, "..", "components", "technician", "UnitHistoryPanel.jsx"),
      "utf8",
    );
    expect(historySource).toContain("Major-Component Policy");
    expect(historySource).toContain("compressor/motor and control board");
    expect(notificationSource).toContain('["maintenance_due", "amp_due_soon", "amp_overdue"]');
    expect(notificationSource).toContain("/customer/units/${encodeURIComponent(item.targetId)}");
    expect(notificationSource).toContain("?page=amp");
    expect(notificationSource).toContain("?page=warranty");
  });

  test("customer screens distinguish loading from a real empty account", () => {
    const homeSource = fs.readFileSync(path.join(__dirname, "..", "app", "customer", "home.jsx"), "utf8");
    const servicesSource = fs.readFileSync(path.join(__dirname, "..", "app", "customer", "services.jsx"), "utf8");
    expect(homeSource).toContain("Loading your latest account activity");
    expect(homeSource).toContain("loading ? (");
    expect(servicesSource).toContain("loadingUnits");
    expect(servicesSource).toContain("Loading registered AC units and open requests");
  });

  test("COD receipts use customer-friendly payment wording", () => {
    const receiptSource = fs.readFileSync(path.join(__dirname, "..", "app", "customer", "receipt", "[id].jsx"), "utf8");
    const orderStorageSource = fs.readFileSync(path.join(__dirname, "orderStorage.jsx"), "utf8");
    expect(receiptSource).toContain("Paid on Delivery");
    expect(receiptSource).toContain("Cash on Delivery");
    expect(receiptSource).toContain("Cash collected upon delivery");
    expect(orderStorageSource).toContain("paymongo: order.paymongo || null");
  });
});
