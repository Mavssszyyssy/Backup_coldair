import { render, screen } from "@testing-library/react";
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
});

test("the AC details modal shows its model once", () => {
  render(<UnitDetailsModal unit={unit} onClose={vi.fn()} />);
  expect(screen.getAllByText(unit.productSku)).toHaveLength(1);
});
