import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import WarrantyStatusModal from "./WarrantyStatusModal";

let language = "English";
vi.mock("../../context/UserContext", () => ({ useUser: () => ({ currentLanguage: language }) }));

test("organizes warranty details without duplicating the brand name", () => {
  language = "English";
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

test("localizes warranty labels without rewriting the AC model or recorded notes", () => {
  language = "Filipino";
  render(<WarrantyStatusModal unit={{ model: "LG Premium Dual Inverter", warranty: {
    serviceRecords: [{ serviceDate: "2026-09-24", visitType: "regular_cleaning", summary: "Original technician note." }],
  } }} onClose={vi.fn()} />);
  expect(screen.getByText("Mga detalye ng warranty")).toBeVisible();
  expect(screen.getByText("LG Premium Dual Inverter")).toBeVisible();
  expect(screen.getByText("Original technician note.")).toBeVisible();
  language = "English";
});
