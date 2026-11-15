import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, Route, RouterProvider, Routes } from "react-router-dom";
import { expect, test, vi } from "vitest";
import GeneralProfileSettings from "./GeneralProfileSettings";
import GlobalDialog from "../common/GlobalDialog";
import Settings from "./Settings";
import { useUser } from "../../context/UserContext";

vi.mock("../../context/UserContext", () => ({ useUser: vi.fn() }));

function renderProfile(profile) {
  const router = createMemoryRouter([
    { path: "/home", element: <h1>Home</h1> },
    { path: "/settings", element: <>{profile}<GlobalDialog /></> },
  ], { initialEntries: ["/home", "/settings"] });
  render(<RouterProvider router={router} />);
  return router;
}

test("a legacy repeated name is flagged and cannot be saved until corrected", async () => {
  const onUpdateProfile = vi.fn().mockImplementation(async (profile) => profile);
  renderProfile(<GeneralProfileSettings user={{
    name_first: "Test Name Test Name",
    name_last: "Reynaldo",
    alias: "zoereynaldo",
    phone: "09393883413",
    email: "zoereynaldo@gmail.com",
  }} onUpdateProfile={onUpdateProfile} />);

  expect(await screen.findByText("First name contains repeated words")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(onUpdateProfile).not.toHaveBeenCalled();

  fireEvent.change(screen.getByPlaceholderText("Juan"), { target: { value: "Zoe" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(onUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({
    name_first: "Zoe",
    name_last: "Reynaldo",
  })));
});

test("both name fields use a 20-character limit and flag existing overlong values", async () => {
  const onUpdateProfile = vi.fn();
  renderProfile(<GeneralProfileSettings user={{
    name_first: "Alexandra-Maria-Lynne",
    name_last: "Reynaldo",
    alias: "zoereynaldo",
    phone: "09393883413",
    email: "zoe@example.com",
  }} onUpdateProfile={onUpdateProfile} />);

  expect(await screen.findByText("First name must be 2–20 characters")).toBeInTheDocument();
  const firstName = screen.getByDisplayValue("Alexandra-Maria-Lynne");
  expect(firstName).toHaveAttribute("maxlength", "20");
  expect(screen.getByDisplayValue("Reynaldo")).toHaveAttribute("maxlength", "20");
  expect(screen.getByText("21/20")).toBeInTheDocument();
  expect(screen.getByText("8/20")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(onUpdateProfile).not.toHaveBeenCalled();
});

test("phone field has a bounded input and explains verification uses email", () => {
  renderProfile(<GeneralProfileSettings user={{
    name_first: "Zoe", name_last: "Reynaldo", alias: "zoereynaldo",
    phone: "09393883413", email: "zoe@example.com",
  }} onUpdateProfile={vi.fn()} />);

  const phone = screen.getByPlaceholderText("09XXXXXXXXX");
  expect(phone).toHaveAttribute("maxlength", "16");
  expect(screen.getByText("Enter 11 digits starting with 09. Used for delivery and service contact; account verification codes are sent to your email.")).toBeInTheDocument();
});

const customer = { name_first: "Ana", name_last: "Santos", alias: "ana.santos", phone: "09123456789", email: "ana@example.com" };

test("web profile Back keeps the draft until Discard is confirmed", async () => {
  const onUpdateProfile = vi.fn();
  const router = renderProfile(<GeneralProfileSettings user={customer} onUpdateProfile={onUpdateProfile} />);
  fireEvent.change(screen.getByPlaceholderText("Juan"), { target: { value: "Maria" } });
  await act(() => router.navigate(-1));
  expect(await screen.findByRole("alertdialog", { name: "Discard changes?" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Keep Editing" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  expect(screen.getByPlaceholderText("Juan")).toHaveValue("Maria");
  await act(() => router.navigate(-1));
  fireEvent.click(await screen.findByRole("button", { name: "Discard" }));
  expect(await screen.findByRole("heading", { name: "Home" })).toBeInTheDocument();
  expect(onUpdateProfile).not.toHaveBeenCalled();
  await act(() => router.navigate(1));
  expect(screen.getByPlaceholderText("Juan")).toHaveValue("Ana");
});

test("failed web profile saves keep the guard active and successful saves clear it", async () => {
  const onUpdateProfile = vi.fn()
    .mockRejectedValueOnce(new Error("Save failed"))
    .mockImplementationOnce(async (profile) => ({ ...customer, ...profile }));
  const router = renderProfile(<GeneralProfileSettings user={customer} onUpdateProfile={onUpdateProfile} />);
  fireEvent.change(screen.getByPlaceholderText("Juan"), { target: { value: "Maria" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(await screen.findByText("Save failed")).toBeInTheDocument();
  await act(() => router.navigate("/home"));
  fireEvent.click(await screen.findByRole("button", { name: "Keep Editing" }));
  await waitFor(() => expect([...router.state.blockers.values()].every(({ state }) => state === "unblocked")).toBe(true));
  expect(screen.getByPlaceholderText("Juan")).toHaveValue("Maria");
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled());
  await act(() => router.navigate(-1));
  expect(await screen.findByRole("heading", { name: "Home" })).toBeInTheDocument();
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});

test("web settings keeps the profile open during tab confirmation and announces a saved profile", async () => {
  const updateProfile = vi.fn().mockImplementation(async (profile) => ({ ...customer, ...profile }));
  useUser.mockReturnValue({ user: customer, updateProfile });
  const router = createMemoryRouter([{
    path: "*",
    element: <><Routes><Route path="/settings" element={<Settings />} /></Routes><GlobalDialog /></>,
  }], { initialEntries: ["/settings"] });
  render(<RouterProvider router={router} />);
  fireEvent.change(screen.getByPlaceholderText("Juan"), { target: { value: "Maria" } });
  fireEvent.click(screen.getByText("Preferences"));
  fireEvent.click(await screen.findByRole("button", { name: "Keep Editing" }));
  expect(router.state.location.search).toBe("");
  expect(screen.getByPlaceholderText("Juan")).toHaveValue("Maria");
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(await screen.findByText("Saved Changes")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Preferences"));
  await waitFor(() => expect(router.state.location.search).toBe("?tab=preferences"));
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});
