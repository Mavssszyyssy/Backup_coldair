import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import AccountSecurityManagement from "./AccountSecurityManagement";

const changePassword = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  changePassword.mockResolvedValue({ message: "Password changed successfully." });
});

test("signed-in password change uses current password, confirmation, and the existing action", async () => {
  render(<AccountSecurityManagement user={{ authProvider: "local" }} onChangePassword={changePassword} />);
  expect(screen.queryByLabelText("Current Password")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
  fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "OldPass123!" } });
  fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "NewPass123!" } });
  fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: "NewPass123!" } });
  fireEvent.click(screen.getByRole("button", { name: "Save New Password" }));
  await waitFor(() => expect(changePassword).toHaveBeenCalledWith("OldPass123!", "NewPass123!"));
  expect(await screen.findByText("Password changed successfully.")).toBeInTheDocument();
  expect(screen.queryByLabelText("Current Password")).not.toBeInTheDocument();
  expect(screen.queryByText("Forgot Password")).not.toBeInTheDocument();
});

test("security settings explain account-bound email sign-in verification", () => {
  render(<AccountSecurityManagement user={{ authProvider: "local" }} onChangePassword={changePassword} />);
  expect(screen.getByText(/one-time code sent to your account email/i)).toBeInTheDocument();
  expect(screen.queryByText(/recovery code/i)).not.toBeInTheDocument();
});
