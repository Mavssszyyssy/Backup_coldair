import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import UnitCard from "./UnitCard";
import UnitDetailsModal from "./UnitDetailsModal";

const unit = {
  id: "unit-1",
  unitName: "Bedroom AC",
  brand: "LG",
  productSku: "LG-HSN24IPX",
  serialNumber: "CAACT-001",
  status: "Good",
};

test("the AC card shows its model once", () => {
  render(
    <UnitCard
      unit={unit}
      position={1}
      onClick={vi.fn()}
      onViewHistory={vi.fn()}
      onWarrantyStatus={vi.fn()}
    />,
  );
  expect(screen.getAllByText(unit.productSku)).toHaveLength(1);
  expect(screen.queryByText("Serial Number")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "View More" }));
  expect(screen.getByText("Serial Number")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "View Less" })).toHaveAttribute("aria-expanded", "true");
});

test("the AC details modal shows its model once", () => {
  render(<UnitDetailsModal unit={unit} onClose={vi.fn()} />);
  expect(screen.getAllByText(unit.productSku)).toHaveLength(1);
});

test("the AC details modal paginates detailed service records", () => {
  render(<UnitDetailsModal unit={{
    ...unit,
    unitHistory: [
      { id: "history-1", date: "2026-09-24", serviceType: "repair", findings: "First visit details" },
      { id: "history-2", date: "2026-08-10", serviceType: "installation", findings: "Second visit details" },
    ],
  }} onClose={vi.fn()} />);

  expect(screen.getByText("First visit details")).toBeVisible();
  expect(screen.queryByText("Second visit details")).not.toBeInTheDocument();
  expect(screen.getAllByText("Service record 1 of 2")).toHaveLength(1);

  fireEvent.click(screen.getByRole("button", { name: "Next service record" }));

  expect(screen.queryByText("First visit details")).not.toBeInTheDocument();
  expect(screen.getByText("Second visit details")).toBeVisible();
  expect(screen.getAllByText("Service record 2 of 2")).toHaveLength(1);
});
