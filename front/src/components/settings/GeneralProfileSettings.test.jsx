import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import GeneralProfileSettings from "./GeneralProfileSettings";

test("a legacy repeated name is flagged and cannot be saved until corrected", async () => {
  const onUpdateProfile = vi.fn().mockResolvedValue({});
  render(<GeneralProfileSettings user={{
    name_first: "Test Name Test Name",
    name_last: "Reynaldo",
    alias: "zoereynaldo",
    phone: "09393883413",
    email: "zoereynaldo@gmail.com",
  }} onUpdateProfile={onUpdateProfile} />);

  expect(await screen.findByText("First name contains repeated words")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save Profile Changes" }));
  expect(onUpdateProfile).not.toHaveBeenCalled();

  fireEvent.change(screen.getByPlaceholderText("Juan"), { target: { value: "Zoe" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Profile Changes" }));
  await waitFor(() => expect(onUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({
    name_first: "Zoe",
    name_last: "Reynaldo",
  })));
});

test("both name fields use a 20-character limit and flag existing overlong values", async () => {
  const onUpdateProfile = vi.fn();
  render(<GeneralProfileSettings user={{
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
  fireEvent.click(screen.getByRole("button", { name: "Save Profile Changes" }));
  expect(onUpdateProfile).not.toHaveBeenCalled();
});

test("phone field has a bounded input and explains verification uses email", () => {
  render(<GeneralProfileSettings user={{
    name_first: "Zoe", name_last: "Reynaldo", alias: "zoereynaldo",
    phone: "09393883413", email: "zoe@example.com",
  }} onUpdateProfile={vi.fn()} />);

  const phone = screen.getByPlaceholderText("09XXXXXXXXX");
  expect(phone).toHaveAttribute("maxlength", "16");
  expect(screen.getByText("Enter 11 digits starting with 09. Used for delivery and service contact; account verification codes are sent to your email.")).toBeInTheDocument();
});
