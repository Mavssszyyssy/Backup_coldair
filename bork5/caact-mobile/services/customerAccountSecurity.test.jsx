import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import CustomerSettingsScreen from "../app/customer/settings";
import { translateText } from "./interfaceI18n";

const mockChangePassword = jest.fn();
const mockUpdateAccount = jest.fn();
const mockSaveAddress = jest.fn();
const mockLogout = jest.fn();
const mockConfirmAction = jest.fn();
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
    logout: mockLogout,
    updateMyAccount: mockUpdateAccount,
    changeMyPassword: mockChangePassword,
    saveDeliveryAddress: mockSaveAddress,
    deleteDeliveryAddress: jest.fn(),
  }),
}));
jest.mock('../utils/confirmAction', () => ({ confirmAction: (...args) => mockConfirmAction(...args) }));
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
  mockCustomer.addresses = [];
  mockCustomer.phone = "09123456789";
  mockChangePassword.mockResolvedValue({ success: true });
});

test("saved address count and eight-address cap leave existing addresses editable", async () => {
  mockCustomer.addresses = Array.from({ length: 8 }, (_, index) => ({
    _id: `address-${index}`, label: `Address ${index + 1}`, name: "Maria Santos",
    phone: "09123456789", street: "Main Street", barangay: "Bago Bantay",
    city: "Quezon City", province: "Metro Manila", region: "NCR", postalCode: "1105",
    isDefault: index === 0,
  }));
  await render(<CustomerSettingsScreen />);
  expect(screen.getByText("8 of 8 saved addresses")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Add another address" }).props.accessibilityState.disabled).toBe(true);
  expect(screen.getByText(/Edit or delete one to add another/)).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Address 2" }));
  expect(screen.getByRole("button", { name: "Save Address" })).toBeTruthy();
}, 10000);

test("customer profile rejects invalid fields without claiming they were saved", async () => {
  await render(<CustomerSettingsScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Edit" }));
  await fireEvent.changeText(screen.getByLabelText("First name"), "123");
  await fireEvent.changeText(screen.getByLabelText("Username"), "a");
  await fireEvent.press(screen.getByRole("button", { name: "Save Account" }));
  expect(mockUpdateAccount).not.toHaveBeenCalled();
  expect(screen.getByText(/Username must be 3-30/)).toBeTruthy();
  expect(screen.queryByText("Account details updated.")).toBeNull();
});

test("account success notice disappears automatically after saving", async () => {
  mockUpdateAccount.mockResolvedValue({ success: true });
  await render(<CustomerSettingsScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Edit" }));
  await fireEvent.press(screen.getByRole("button", { name: "Save Account" }));
  expect(await screen.findByText("Account details updated.")).toBeTruthy();
  await waitFor(() => expect(screen.queryByText("Account details updated.")).toBeNull(), { timeout: 6000 });
  expect(mockUpdateAccount).toHaveBeenCalledTimes(1);
}, 10000);

test("address edits validate the recipient and save the changed street to the same address", async () => {
  mockCustomer.addresses = [{
    _id: "address-1", label: "Home", name: "Maria Santos", phone: "09123456789",
    region: "NCR", regionCode: "130000000", province: "Metro Manila", provinceCode: "133900000",
    city: "Quezon City", municipalityCode: "137404000", barangay: "Bago Bantay",
    submunicipalityCode: "137404001", street: "Old Street", postalCode: "1105", isDefault: true,
  }];
  mockSaveAddress.mockResolvedValue({ success: true });
  await render(<CustomerSettingsScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Home · Default" }));
  await fireEvent.changeText(screen.getByLabelText("Recipient name"), "12345");
  await fireEvent.press(screen.getByRole("button", { name: "Save Address" }));
  expect(mockSaveAddress).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText("Recipient name"), "Maria Santos");
  await fireEvent.changeText(screen.getByLabelText("Street address"), "New Street");
  await fireEvent.press(screen.getByRole("button", { name: "Save Address" }));
  await waitFor(() => expect(mockSaveAddress).toHaveBeenCalledWith(expect.objectContaining({ name: "Maria Santos", street: "New Street" }), "address-1"));
  expect(await screen.findByText("Delivery address updated and branch refreshed.")).toBeTruthy();
});

test("customer mobile changes a password with current-password verification", async () => {
  await render(<CustomerSettingsScreen />);
  await fireEvent.press(screen.getByRole("button", { name: "Reset Password" }));
  await fireEvent.changeText(screen.getByLabelText("Current Password"), "OldPass123!");
  await fireEvent.changeText(screen.getByLabelText("New Password"), "NewPass123!");
  await fireEvent.changeText(screen.getByLabelText("Confirm New Password"), "NewPass123!");
  await fireEvent.press(screen.getByRole("button", { name: "Reset Password" }));
  await waitFor(() => expect(mockChangePassword).toHaveBeenCalledWith({ currentPassword: "OldPass123!", newPassword: "NewPass123!" }));
  expect(await screen.findByText("Password changed successfully.")).toBeTruthy();
});

test("customer mobile explains the email code without claiming a verified security state", async () => {
  await render(<CustomerSettingsScreen />);
  expect(screen.getByText("Personal details")).toBeTruthy();
  expect(screen.getByText("Password & sign-in")).toBeTruthy();
  expect(screen.getByText("Email code at sign-in")).toBeTruthy();
  expect(screen.getByText(/may be asked for a one-time code sent to your email/i)).toBeTruthy();
  expect(screen.queryByText("Email Sign-in Verification")).toBeNull();
  expect(translateText("Email code at sign-in", "Filipino")).toBe("Email code sa pag-sign in");
  expect(translateText("Password & sign-in", "Filipino")).toBe("Password at pag-sign in");
});

test("customer Account menu omits the assistant while keeping FAQs available", async () => {
  await render(<CustomerSettingsScreen />);
  expect(screen.queryByRole("button", { name: "AEROPULSE Assistant" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Frequently Asked Questions" }));
  expect(mockPush).toHaveBeenCalledWith("/customer/faq");
});

test('customer sign out follows Help and requires confirmation before ending the session', async () => {
  mockLogout.mockResolvedValue(undefined);
  await render(<CustomerSettingsScreen />);
  const help = screen.getByRole('button', { name: 'Frequently Asked Questions' });
  const signOut = screen.getByRole('button', { name: 'Sign out' });
  const buttons = screen.getAllByRole('button');
  expect(buttons.indexOf(signOut)).toBeGreaterThan(buttons.indexOf(help));
  await fireEvent.press(signOut);
  expect(mockConfirmAction).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Sign out?', confirmText: 'Sign out', destructive: true, onConfirm: expect.any(Function),
  }));
  expect(mockLogout).not.toHaveBeenCalled();
  await mockConfirmAction.mock.calls.at(-1)[0].onConfirm();
  expect(mockLogout).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith('/sign-in');
});
