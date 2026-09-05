import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import CustomerOobeScreen from "../app/customer/oobe";

const mockReplace = jest.fn();
const mockLogout = jest.fn().mockResolvedValue(undefined);
const mockUpdateMyAccount = jest.fn();
const mockSecurityStatus = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }), useLocalSearchParams: () => ({}),
  useFocusEffect: (callback) => require("react").useEffect(callback, []),
}));
jest.mock("../context/UserContext", () => ({ useUserContext: () => ({ current: { id: "fixture" }, logout: mockLogout, updateMyAccount: mockUpdateMyAccount, verifySecuritySetup: jest.fn() }) }));
jest.mock("./customerSecurityService", () => ({
  getAccountSecurityStatus: (...args) => mockSecurityStatus(...args),
  ensureRecoveryCodes: jest.fn().mockResolvedValue([]), ensureCustomerTotpSecret: jest.fn().mockResolvedValue("TEST-SETUP-PLACEHOLDER"), regenerateRecoveryCodes: jest.fn(),
}));
jest.mock("../components/customer/CustomerScreen", () => ({ children }) => <>{children}</>);
jest.mock("../components/ui/QrCodeMatrix", () => () => null);

beforeEach(() => {
  jest.clearAllMocks();
  mockSecurityStatus.mockResolvedValue({ totpEnabled: false });
});

test("an unfinished authenticator setup allows switching accounts without bypassing verification", async () => {
  await render(<CustomerOobeScreen />);
  await screen.findByText("TEST-SETUP-PLACEHOLDER");
  expect(screen.getByText("Verify Authenticator to Continue")).toBeDisabled();
  await fireEvent.press(screen.getByText("I have a different account"));
  await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
  expect(mockReplace).toHaveBeenCalledWith("/sign-in");
});

test("completing setup saves only its completion flag before navigating home", async () => {
  mockSecurityStatus.mockResolvedValue({ totpEnabled: true });
  mockUpdateMyAccount.mockResolvedValue({ success: true, user: { customerOnboardedAt: "2026-09-06T00:00:00Z" } });
  await render(<CustomerOobeScreen />);
  await screen.findByText("Continue to Home");
  await fireEvent.press(screen.getByText("Continue to Home"));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/customer/home"));
  expect(Object.keys(mockUpdateMyAccount.mock.calls[0][0])).toEqual(["customer_onboarded_at"]);
});

test("failed setup completion is shown instead of pretending it saved", async () => {
  mockSecurityStatus.mockResolvedValue({ totpEnabled: true });
  mockUpdateMyAccount.mockResolvedValue({ success: false, error: "Unable to save setup." });
  await render(<CustomerOobeScreen />);
  await screen.findByText("Continue to Home");
  await fireEvent.press(screen.getByText("Continue to Home"));
  await screen.findByText("Unable to save setup.");
  expect(mockReplace).not.toHaveBeenCalled();
});
