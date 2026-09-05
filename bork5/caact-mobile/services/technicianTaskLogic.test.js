import {
  formatWarrantyStatus,
  isInstallationWorkOrder,
  ROOM_SIZE_OPTIONS,
  getTaskSerialNumbers,
  suggestedServiceType,
} from "./technicianTaskLogic";

describe("technician work order logic", () => {
  test("unloaded tasks and incomplete serial items cannot crash work-order screens", () => {
    expect(isInstallationWorkOrder(null)).toBe(false);
    expect(isInstallationWorkOrder(undefined)).toBe(false);
    expect(getTaskSerialNumbers(null)).toEqual([]);
    expect(getTaskSerialNumbers({ items: [null, { serialUnits: [null, { serialNumber: "CAA-001" }] }] })).toEqual(["CAA-001"]);
    expect(suggestedServiceType(null)).toBe("inspection");
  });
  test("keeps maintenance separate from installation verification", () => {
    expect(isInstallationWorkOrder({ requestId: "request-1", title: "Maintenance" })).toBe(false);
    expect(isInstallationWorkOrder({ orderId: "order-1", serialNumbers: ["CAA-001"] })).toBe(true);
  });

  test("provides customer-safe warranty labels", () => {
    expect(formatWarrantyStatus("pending_activation")).toBe("Pending activation");
    expect(formatWarrantyStatus("active")).toBe("Active");
    expect(formatWarrantyStatus(null, { installationPending: true })).toBe("Activates after verified installation");
    expect(formatWarrantyStatus(null)).toBe("Not available for this work order");
  });

  test("offers established room-size choices", () => {
    expect(ROOM_SIZE_OPTIONS.map((option) => option.value)).toEqual([6, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 50]);
  });
});
