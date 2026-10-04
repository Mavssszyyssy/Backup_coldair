import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { apiRequest } from "../../../config/api";
import { useUser } from "../../../context/UserContext";
import SuperAdminDashboard from "./SuperAdminDashboard";

vi.mock("../Common/SuperAdminLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../../../config/api", () => ({ apiRequest: vi.fn() }));
vi.mock("../../../context/UserContext", () => ({ useUser: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  apiRequest.mockResolvedValue({ stats: {}, analytics: {} });
});

test("executive profile limits the Superadmin phone field to 11 digits and saves it", async () => {
  const updateProfile = vi.fn().mockResolvedValue({});
  useUser.mockReturnValue({
    user: { name: "Super Admin", phone: "09123456789", address: "Plaridel, Bulacan" },
    updateProfile,
  });

  render(<MemoryRouter><SuperAdminDashboard /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Edit executive profile" }));

  const phoneInput = screen.getByRole("textbox", { name: "Phone number" });
  expect(phoneInput).toHaveAttribute("maxlength", "11");
  fireEvent.change(phoneInput, { target: { value: "09789654322888" } });
  expect(phoneInput).toHaveValue("09789654322");

  fireEvent.change(phoneInput, { target: { value: "09123456789" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ phone: "09123456789" })));
});
