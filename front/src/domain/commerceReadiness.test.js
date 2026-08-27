import { describe, expect, it } from "vitest";
import { validatePostalCodeForAddress } from "./location/postalCodeValidation";
import { computePurchaseTotals } from "./purchase/computePurchaseTotals";
import { buildCustomerOrder } from "./purchase/buildCustomerOrder";

describe("customer commerce rules", () => {
  it("requires a postal code that matches the selected city", () => {
    const address = { region: "CALABARZON", province: "Cavite", city: "Bacoor" };
    expect(validatePostalCodeForAddress({ ...address, postalCode: "" })).toMatch(/required/i);
    expect(validatePostalCodeForAddress({ ...address, postalCode: "4102" })).toBe("");
    expect(validatePostalCodeForAddress({ ...address, postalCode: "1000" })).toMatch(/does not match/i);
  });

  it("preserves horsepower and delivery details in a COD order", () => {
    const totals = computePurchaseTotals({ subtotal: 20000, serviceAreaId: "default", discountAmount: 0 });
    const address = {
      name: "Customer", region: "CALABARZON", province: "Cavite", city: "Bacoor",
      barangay: "Molino I", street: "Block 1 Lot 2", postalCode: "4102", phone: "09123456789",
    };
    const order = buildCustomerOrder({
      orderId: "ORD-TEST",
      trackingNumber: "TRK-TEST",
      cartItems: [{ id: "p1", name: "Split Unit", price: 20000, quantity: 1, horsepower: 1.5 }],
      address,
      paymentMethod: "cod",
      serviceAreaId: "default",
      totals,
    });
    expect(order.items[0].horsepower).toBe(1.5);
    expect(order.address.postalCode).toBe("4102");
    expect(order.paymentMethod).toBe("cod");
  });
});
