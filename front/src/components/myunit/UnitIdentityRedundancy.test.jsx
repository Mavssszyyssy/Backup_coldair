import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { vi } from "vitest";
import UnitCard from "./UnitCard";
import UnitDetailsModal from "./UnitDetailsModal";
import ServiceHistory from "./ServiceHistory";

const mockLanguage = vi.hoisted(() => ({ current: "English" }));
vi.mock("../../context/UserContext", () => ({ useUser: () => ({ currentLanguage: mockLanguage.current }) }));

test("Filipino service history labels preserve the recorded branch and technician names", () => {
  mockLanguage.current = "Filipino";
  try {
    render(<ServiceHistory unit={unit} onClose={vi.fn()} />);
    expect(screen.getByText("Numero ng Order")).toBeInTheDocument();
    expect(screen.getByText("Technician na nag-install")).toBeInTheDocument();
    expect(screen.getByText(unit.installingTechnician)).toBeInTheDocument();
    expect(screen.getByText(unit.purchaseBranch)).toBeInTheDocument();
    expect(screen.getByText(unit.serialNumber)).toBeInTheDocument();
  } finally {
    mockLanguage.current = "English";
  }
});

const unit = {
  id: "unit-1",
  unitName: "Bedroom AC",
  brand: "LG",
  productSku: "LG-HSN24IPX",
  serialNumber: "CAACT-001",
  status: "Good",
  purchaseBranch: "Cavite",
  serviceBranch: "Laguna",
  installingTechnician: "Alex Santos",
};

test("the AC card uses a single Service History action and keeps its details in the modal", () => {
  const openDetails = vi.fn();
  function UnitCardAndHistory() {
    const [selected, setSelected] = useState(null);
    return <><UnitCard unit={unit} position={1} onClick={openDetails} onViewHistory={setSelected} onWarrantyStatus={vi.fn()} />
      {selected && <ServiceHistory unit={selected} onClose={() => setSelected(null)} />}</>;
  }
  render(<UnitCardAndHistory />);
  expect(screen.getAllByText(unit.productSku)).toHaveLength(1);
  expect(screen.queryByText("Serial Number")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "View More" })).not.toBeInTheDocument();
  const historyButton = screen.getByRole("button", { name: "Service History" });
  historyButton.focus();
  fireEvent.click(historyButton);
  const dialog = screen.getByRole("dialog", { name: "Service history" });
  const facts = within(dialog).getByRole("region", { name: "Purchase and installation" });
  expect(within(facts).getByText(unit.serialNumber)).toBeInTheDocument();
  expect(within(facts).getByText(unit.purchaseBranch)).toBeInTheDocument();
  expect(within(facts).getByText(unit.serviceBranch)).toBeInTheDocument();
  expect(within(facts).getByText(unit.installingTechnician)).toBeInTheDocument();
  expect(within(facts).getAllByText("Not recorded").length).toBeGreaterThan(0);
  expect(within(dialog).getByText("No matching service records")).toBeInTheDocument();
  expect(openDetails).not.toHaveBeenCalled();
  const close = within(dialog).getByRole("button", { name: "Close service history" });
  expect(close).toHaveFocus();
  fireEvent.keyDown(close, { key: "Escape" });
  expect(dialog).not.toBeInTheDocument();
  expect(historyButton).toHaveFocus();
});

test("the AC details modal shows its model once", () => {
  render(<UnitDetailsModal unit={unit} onClose={vi.fn()} />);
  expect(screen.getAllByText(unit.productSku)).toHaveLength(1);
});

test("purchase details stay visible while paging through service records", () => {
  render(<ServiceHistory unit={{ ...unit, unitHistory: [
    { id: "repair", date: "2026-09-24", serviceType: "repair", findings: "Later repair details" },
    { id: "installation", date: "2026-08-10", serviceType: "installation", findings: "Original installation details" },
  ] }} onClose={vi.fn()} />);
  expect(screen.getByText("Later repair details")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next service record" }));
  expect(screen.getByText("Original installation details")).toBeVisible();
  expect(screen.getByText(unit.purchaseBranch)).toBeVisible();
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
