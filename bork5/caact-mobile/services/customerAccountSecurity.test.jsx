import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import CustomerSettingsScreen from "../app/customer/settings";

const mockChangePassword = jest.fn();
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
};

jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace, push: mockPush }) }));
jest.mock("../context/UserContext", () => ({
  useUserContext: () => ({
    current: mockCustomer,
    logout: jest.fn(),
    updateMyAccount: jest.fn(),
    changeMyPassword: mockChangePassword,
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

test("customer mobile explains email sign-in verification without another security setup action", async () => {
  await render(<CustomerSettingsScreen />);
  expect(screen.getByText(/verify the code sent to your email/i)).toBeTruthy();
});
