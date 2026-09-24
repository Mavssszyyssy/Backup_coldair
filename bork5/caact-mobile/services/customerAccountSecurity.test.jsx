import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import CustomerSettingsScreen from "../app/customer/settings";

const mockChangePassword = jest.fn();
const mockResetAuthenticator = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockCustomer = {
  id: "customer-fixture",
  role: "customer",
  name_first: "Pat",
  name_last: "Customer",
  alias: "pat.customer",
  email: "pat@example.com",
  addresses: [],
  security: { totpEnabled: true },
};

jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace, push: mockPush }) }));
jest.mock("../context/UserContext", () => ({
  useUserContext: () => ({
    current: mockCustomer,
    logout: jest.fn(),
    updateMyAccount: jest.fn(),
    changeMyPassword: mockChangePassword,
    resetMyAuthenticator: mockResetAuthenticator,
    saveDeliveryAddress: jest.fn(),
    deleteDeliveryAddress: jest.fn(),
  }),
}));
jest.mock("../components/customer/CustomerScreen", () => ({ children, stickyAction }) => <>{children}{stickyAction}</>);
jest.mock("./philippineAddressService", () => ({
  getPhilippineRegions: jest.fn().mockResolvedValue([]),
  getProvincesByRegion: jest.fn().mockResolvedValue([]),
  getLocalitiesByProvince: jest.fn().mockResolvedValue([]),
  getBarangaysByLocality: jest.fn().mockResolvedValue([]),
  resolvePhilippineAddressSelection: jest.fn().mockResolvedValue({}),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockChangePassword.mockResolvedValue({ success: true });
  mockResetAuthenticator.mockResolvedValue({ success: true });
});

test("customer mobile changes a password with current-password verification", async () => {
  await render(<CustomerSettingsScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Change Password" }));
  await fireEvent.changeText(screen.getByLabelText("Current Password"), "OldPass123!");
  await fireEvent.changeText(screen.getByLabelText("New Password"), "NewPass123!");
  await fireEvent.changeText(screen.getByLabelText("Confirm New Password"), "NewPass123!");
  await fireEvent.press(screen.getByRole("button", { name: "Change Password" }));
  await waitFor(() => expect(mockChangePassword).toHaveBeenCalledWith({ currentPassword: "OldPass123!", newPassword: "NewPass123!" }));
  expect(await screen.findByText("Password changed successfully.")).toBeTruthy();
});

test("customer mobile resets only its verified authenticator and continues to existing setup", async () => {
  await render(<CustomerSettingsScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Authentication Change / Reset" }));
  await fireEvent.changeText(screen.getByLabelText("Current Password"), "OldPass123!");
  await fireEvent.changeText(screen.getByLabelText("Current Authenticator Code"), "123456");
  await fireEvent.press(screen.getByRole("button", { name: "Reset Authenticator" }));
  await waitFor(() => expect(mockResetAuthenticator).toHaveBeenCalledWith({ currentPassword: "OldPass123!", currentCode: "123456" }));
  expect(mockReplace).toHaveBeenCalledWith("/customer/oobe/reset");
});
