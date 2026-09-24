import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import AccountSecurityManagement from "./AccountSecurityManagement";

const changePassword = vi.fn();
const resetAuthenticator = vi.fn();
const beginSetup = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  changePassword.mockResolvedValue({ message: "Password changed successfully." });
  resetAuthenticator.mockResolvedValue({ success: true });
});

test("signed-in password change uses current password, confirmation, and the existing action", async () => {
  render(<AccountSecurityManagement user={{ authProvider: "local", security: { totpEnabled: true } }} onChangePassword={changePassword} onResetAuthenticator={resetAuthenticator} onBeginAuthenticatorSetup={beginSetup} />);
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

test("authenticator replacement verifies the current account before reset", async () => {
  render(<AccountSecurityManagement user={{ authProvider: "local", security: { totpEnabled: true } }} onChangePassword={changePassword} onResetAuthenticator={resetAuthenticator} onBeginAuthenticatorSetup={beginSetup} />);
  expect(screen.getByText("Enabled")).toBeInTheDocument();
  expect(screen.queryByLabelText("Current Authenticator Code")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Change / Reset Authenticator" }));
  fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "OldPass123!" } });
  fireEvent.change(screen.getByLabelText("Current Authenticator Code"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue Authenticator Reset" }));
  await waitFor(() => expect(resetAuthenticator).toHaveBeenCalledWith({ currentPassword: "OldPass123!", currentCode: "123456" }));
});

test("an account without TOTP is sent through the existing setup flow", () => {
  render(<AccountSecurityManagement user={{ authProvider: "local", security: { totpEnabled: false } }} onChangePassword={changePassword} onResetAuthenticator={resetAuthenticator} onBeginAuthenticatorSetup={beginSetup} />);
  fireEvent.click(screen.getByRole("button", { name: "Set Up Authenticator" }));
  expect(beginSetup).toHaveBeenCalledTimes(1);
});
