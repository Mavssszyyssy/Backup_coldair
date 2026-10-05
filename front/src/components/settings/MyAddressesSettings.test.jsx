import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { apiRequest } from "../../config/api";
import { alertDialog } from "../../utils/dialog";
import MyAddressesSettings from "./MyAddressesSettings";

vi.mock("../../config/api", () => ({ apiRequest: vi.fn() }));
vi.mock("../../utils/dialog", () => ({ alertDialog: vi.fn(), confirmDialog: vi.fn() }));
vi.mock("../checkout/AddAddressModal", () => ({
  default: ({ onSave, initialAddress }) => (
    <button type="button" onClick={() => onSave({ label: "Home" })}>
      {initialAddress ? "Save edited address" : "Save new address"}
    </button>
  ),
}));

const address = {
  id: "a1",
  label: "Home",
  name: "Customer",
  phone: "09123456789",
  street: "Old street",
  barangay: "Molino I",
  city: "Bacoor",
  province: "Cavite",
  region: "CALABARZON",
  isDefault: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

test("uses Delivery Addresses and confirms a successful address update", async () => {
  apiRequest.mockImplementation(async (path) => {
    if (path === "/users/addresses") return { addresses: [address] };
    return {};
  });

  render(<MyAddressesSettings />);
  expect(screen.getByRole("heading", { name: "Delivery Addresses" })).toBeInTheDocument();
  await screen.findByText(/Old street/);
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.click(screen.getByRole("button", { name: "Save edited address" }));

  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(
    "/users/addresses/a1",
    expect.objectContaining({ method: "PATCH" }),
  ));
  expect(alertDialog).toHaveBeenCalledWith({
    title: "Delivery address updated",
    message: "Your delivery address was updated successfully.",
    confirmText: "Done",
  });
});

test("confirms a newly added delivery address after the save succeeds", async () => {
  apiRequest.mockImplementation(async (path, options = {}) => {
    if (path === "/users/addresses" && options.method === "POST") return {};
    if (path === "/users/addresses") return { addresses: [] };
    return {};
  });

  render(<MyAddressesSettings />);
  await screen.findByText("No saved addresses yet.");
  fireEvent.click(screen.getByRole("button", { name: /Add Address/i }));
  fireEvent.click(screen.getByRole("button", { name: "Save new address" }));

  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(
    "/users/addresses",
    expect.objectContaining({ method: "POST" }),
  ));
  expect(alertDialog).toHaveBeenCalledWith({
    title: "Delivery address added",
    message: "Your delivery address was added successfully.",
    confirmText: "Done",
  });
});
