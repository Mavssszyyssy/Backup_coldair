import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import WarrantyStatusModal from "./WarrantyStatusModal";

test("organizes warranty details without duplicating the brand name", () => {
  const onClose = vi.fn();
  render(
    <WarrantyStatusModal
      unit={{
        brand: "LG",
        model: "LG Premium Dual Inverter 3.0HP",
        warrantyStatus: "active",
        warranty: {
          warrantyType: "1 year parts / 5 years compressor",
          startDate: "2026-09-22",
          componentCoverage: [
            { component: "Parts", expirationDate: "2027-09-22", status: "active" },
          ],
          coverageLimitations: ["Labor is subject to branch review."],
          serviceRecords: [
            { serviceDate: "2026-09-24", visitType: "regular_cleaning", summary: "Cleaned the air filter." },
          ],
        },
      }}
      onClose={onClose}
    />,
  );

  expect(screen.getByRole("dialog", { name: "Warranty details" })).toBeVisible();
  expect(screen.getByText("LG Premium Dual Inverter 3.0HP")).toBeVisible();
  expect(screen.queryByText(/LG LG Premium/)).not.toBeInTheDocument();
  expect(screen.getByText("Coverage limitations")).toBeVisible();
  expect(screen.getByText("Regular cleaning")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "Close warranty details" }));
  expect(onClose).toHaveBeenCalledOnce();
});
