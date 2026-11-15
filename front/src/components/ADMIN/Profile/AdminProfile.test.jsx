import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { expect, test, vi } from "vitest";
import { useUser } from "../../../context/UserContext";
import GlobalDialog from "../../common/GlobalDialog";
import AdminProfile from "./AdminProfile";

vi.mock("../../../context/UserContext", () => ({ useUser: vi.fn() }));
vi.mock("../Common/AdminLayout", () => ({ default: ({ children }) => <main>{children}</main> }));

test("Admin can keep or discard an edited profile and sees Saved Changes after saving", async () => {
  const updateProfile = vi.fn().mockResolvedValue({});
  useUser.mockReturnValue({
    user: { name: "Branch Admin", phone: "09123456789", role: "admin" },
    updateProfile,
    currentLanguage: "English",
  });
  const router = createMemoryRouter([{ path: "/", element: <><AdminProfile /><GlobalDialog /></> }]);
  render(<RouterProvider router={router} />);
  const edit = screen.getByRole("button", { name: "Edit Profile" });
  fireEvent.click(edit);
  fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "Edited Admin" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  const keepEditing = await screen.findByRole("button", { name: "Keep Editing" });
  await act(async () => { fireEvent.click(keepEditing); });
  expect(screen.getByPlaceholderText("Name")).toHaveValue("Edited Admin");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(await screen.findByRole("button", { name: "Discard" }));
  await waitFor(() => expect(screen.queryByPlaceholderText("Name")).not.toBeInTheDocument());
  expect(updateProfile).not.toHaveBeenCalled();
  fireEvent.click(edit);
  expect(screen.getByPlaceholderText("Name")).toHaveValue("Branch Admin");
  fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "New Admin" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(await screen.findByText("Saved Changes")).toBeInTheDocument();
  expect(updateProfile).toHaveBeenCalledWith({ name: "New Admin", phone: "09123456789" });
});
